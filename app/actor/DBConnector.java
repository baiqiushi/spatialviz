package actor;
import akka.actor.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import model.Query;
import play.libs.Json;
import util.MyLogger;

import java.sql.*;

import com.typesafe.config.Config;
import javax.inject.Inject;

public class DBConnector extends AbstractActor {

    private Connection conn = null;
    private Config config;
    private String driver;
    private String url;
    private String username;
    private String password;

    public static Props props(ActorRef out, Config config) {
        return Props.create(DBConnector.class, out, config);
    }

    private final ActorRef out;

    private String name;
    private double[] xRange;
    private double[] yRange;
    private String table;
    private String xCol;
    private String yCol;
    private String time;
    private String timeMin;
    private String timeMax;
    private String timeFormat;
    private int nInterval;
    private int nBucket;
    private double[][] map;

    private double[] base_res;
    private int num_zooms;
    private int zoom_step;
    private String mrv_table;
    private String mrvplus_table;
    private String mrvplusplus_table;
    private String mrv_xCol;
    private String mrv_yCol;

    @Inject
    public DBConnector(ActorRef out, Config config) {
        this.out = out;
        this.config = config;

        // PostgreSQL config
        this.driver = config.getString("postgresql.driver");
        this.url = config.getString("postgresql.url");
        this.username = config.getString("postgresql.username");
        this.password = config.getString("postgresql.password");

        // NYC Taxi dataset config
        this.name = config.getString("nyc.name");
        this.xRange = new double[]{config.getDoubleList(this.name + ".xRange").get(0), config.getDoubleList(this.name + ".xRange").get(1)};
        this.yRange = new double[]{config.getDoubleList(this.name + ".yRange").get(0), config.getDoubleList(this.name + ".yRange").get(1)};
        this.map = new double[][]{this.xRange, this.yRange};
        this.table = config.getString(this.name + ".table");
        this.xCol = config.getString(this.name + ".xCol");
        this.yCol = config.getString(this.name + ".yCol");
        this.time = config.getString(this.name + ".time");
        this.timeMin = config.getString(this.name + ".timeMin");
        this.timeMax = config.getString(this.name + ".timeMax");
        this.timeFormat = config.getString(this.name + ".timeFormat");
        this.nInterval = config.getInt(this.name + ".nInterval");
        this.nBucket = config.getInt(this.name + ".nBucket");

        // mrv config
        this.base_res = new double[]{config.getDoubleList("mrv.base_res").get(0), config.getDoubleList("mrv.base_res").get(1)};
        this.num_zooms = config.getInt("mrv.num_zooms");
        this.zoom_step = config.getInt("mrv.zoom_step");
        this.mrv_table = config.getString("mrv.mrv_table");
        this.mrvplus_table = config.getString("mrv.mrvplus_table");
        this.mrvplusplus_table = config.getString("mrv.mrvplusplus_table");
        this.mrv_xCol = config.getString("mrv.xCol");
        this.mrv_yCol = config.getString("mrv.yCol");

        connectDB();
    }

    private boolean connectDB() {

        if (conn != null) {
            MyLogger.info(this.getClass(), "DB connection is alive.");
            return true;
        }

        MyLogger.info(this.getClass(), "Connecting to DB ...");
        try {
            Class.forName(driver);
            conn = DriverManager.getConnection(url, username, password);
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
            MyLogger.error(this.getClass(), "JDBC Driver Class not found!");
            return false;
        } catch (SQLException e) {
            e.printStackTrace();
            MyLogger.error(this.getClass(), "Can not connect to DB!");
            return false;
        }

        MyLogger.info(this.getClass(), "Connected to DB successfully.");
        return true;
    }

    private int range_zoom_level(double x0, double y0, double x1, double y1) {
        double delta_x = Math.abs(x1 - x0);
        double delta_y = Math.abs(y1 - y0);
        double ratio_x = (map[0][1] - map[0][0]) / delta_x;
        double ratio_y = (map[1][1] - map[1][0]) / delta_y;
        int zoom_level_x =  (int) Math.round(Math.log(ratio_x) / Math.log(2));
        int zoom_level_y = (int) Math.round(Math.log(ratio_y) / Math.log(2));
        return Math.max(zoom_level_x, zoom_level_y);
    }

    private double[] get_steps(int zoom_level) {
        double[] ranges = {map[0][1] - map[0][0], map[1][1] - map[1][0]};
        double[] res = {base_res[0] * Math.pow(zoom_step, zoom_level), base_res[1] * Math.pow(zoom_step, zoom_level)};
        return new double[]{ranges[0] / res[0], ranges[1] / res[1]};
    }

    private double[] project_query_range(double x0, double y0, double x1, double y1, int zoom_level) {
        x0 = x0 - map[0][0];
        y0 = y0 - map[1][0];
        x1 = x1 - map[0][0];
        y1 = y1 - map[1][0];
        double[] steps = get_steps(zoom_level);
        double px0 = (double) Math.round(x0 / steps[0]);
        double px1 = Math.ceil(x1 / steps[0]);
        double py0 = (double) Math.round(y0 / steps[1]);
        double py1 = Math.ceil(y1 / steps[1]);
        return new double[]{px0, py0, px1, py1};
    }

    private ObjectNode query_raw_table(Query query) {
        ObjectNode result = JsonNodeFactory.instance.objectNode();
        String sql = " SELECT " + xCol + ", " + yCol +
                " FROM " + table +
                " WHERE " + time + " between '" + query.start + "' AND '" + query.end + "' " +
                " AND " + xCol + " between " + query.x0 + " AND " + query.x1 +
                " AND " + yCol + " between " + query.y0 + " AND " + query.y1;
        result.put("query", sql);
        long start = System.nanoTime();
        try {
            PreparedStatement statement = conn.prepareStatement(sql);
            MyLogger.info(this.getClass(), "SQL statement = \n" + statement);
            ResultSet rs = statement.executeQuery();
            ArrayNode resultArray = result.putArray("result");
            while (rs.next()) {
                ArrayNode resultTuple = JsonNodeFactory.instance.arrayNode();
                resultTuple.add(rs.getDouble(1));
                resultTuple.add(rs.getDouble(2));
                resultArray.add(resultTuple);
            }
            result.put("length", resultArray.size());
            MyLogger.info(this.getClass(), "query finished, result size = " + resultArray.size());
        } catch (SQLException e) {
            MyLogger.error(this.getClass(), e.getMessage());
        }
        long end = System.nanoTime();
        long query_time = end - start;
        System.out.println("query done, time: " + query_time / 1000000 + " ms");
        result.put("time", query_time);
        return result;
    }

    private ObjectNode query_mrv_table(Query query, int zoom_level) {
        ObjectNode result = JsonNodeFactory.instance.objectNode();
        double[] p = project_query_range(query.x0, query.y0, query.x1, query.y1, zoom_level);
        String sql = " SELECT " + mrv_xCol + ", " + mrv_yCol +
                " FROM " + mrv_table + "_" + zoom_level +
                " WHERE " + mrv_xCol + " between " + (int)p[0] + " AND " + (int)p[2] +
                " AND " + mrv_yCol + " between " + (int)p[1] + " AND " + (int)p[3];
        result.put("query", sql);
        long query_time = 0L;
        long parse_time = 0L;
        long start = System.nanoTime();
        try {
            PreparedStatement statement = conn.prepareStatement(sql);
            MyLogger.info(this.getClass(), "SQL statement = \n" + statement);
            ResultSet rs = statement.executeQuery();
            query_time += System.nanoTime() - start;
            start = System.nanoTime();
            ArrayNode resultArray = result.putArray("result");
            parse_time += System.nanoTime() - start;
            double[] steps = get_steps(zoom_level);
            start = System.nanoTime();
            while (rs.next()) {
                double x = rs.getDouble(1);
                double y = rs.getDouble(2);
                query_time += System.nanoTime() - start;
                start = System.nanoTime();
                ArrayNode resultTuple = JsonNodeFactory.instance.arrayNode();
                resultTuple.add((float) (map[0][0] + x * steps[0]));
                resultTuple.add((float) (map[1][0] + y * steps[1]));
                resultArray.add(resultTuple);
                parse_time += System.nanoTime() - start;
                start = System.nanoTime();
            }
            start = System.nanoTime();
            result.put("length", resultArray.size());
            parse_time += System.nanoTime() - start;
            MyLogger.info(this.getClass(), "query finished, result size = " + resultArray.size());
        } catch (SQLException e) {
            MyLogger.error(this.getClass(), e.getMessage());
        }
        System.out.println("query time: " + query_time / 1000000 + " ms");
        System.out.println("parse time: " + parse_time / 1000000 + " ms");
        result.put("time", query_time);
        return result;
    }

    private JsonNode queryDB(Query query) {
        ObjectNode result = JsonNodeFactory.instance.objectNode();
        if (query.mode.equalsIgnoreCase("raw data")) {
            result = query_raw_table(query);
        } else if (query.mode.equalsIgnoreCase("mrv")) {
            int zoom_level = range_zoom_level(query.x0, query.y0, query.x1, query.y1);
            if (zoom_level > num_zooms - 1) {
                result = query_raw_table(query);
            } else {
                result = query_mrv_table(query, zoom_level);
            }
        }
        return result;
    }


    @Override
    public Receive createReceive() {
        return receiveBuilder()
                .match(JsonNode.class, request -> {
                    Query query = Json.fromJson(request, Query.class);
                    MyLogger.info(this.getClass(), query.toString());

                    JsonNode result = queryDB(query);

                    out.tell(result, self());
                })
                .build();
    }
}
