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
    private Config config = null;
    private String driver = null;
    private String url = null;
    private String username = null;
    private String password = null;

    public static Props props(ActorRef out, Config config) {
        return Props.create(DBConnector.class, out, config);
    }

    private final ActorRef out;

    @Inject
    public DBConnector(ActorRef out, Config config) {
        this.out = out;
        this.config = config;
        this.driver = config.getString("postgresql.driver");
        this.url = config.getString("postgresql.url");
        this.username = config.getString("postgresql.username");
        this.password = config.getString("postgresql.password");

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

    private JsonNode queryDB(Query query) {
        ObjectNode result = JsonNodeFactory.instance.objectNode();

        // TODO - use another function to rewrite query into a list of SQL string statemnts
        String sql = " SELECT pickup_longitude, pickup_latitude " +
                " FROM yellow_pickup " +
                " WHERE pickup_datetime between '" + query.start + "' AND '" + query.end + "' " +
                " AND pickup_longitude between " + query.x0 + " AND " + query.x1 +
                " AND pickup_latitude between " + query.y0 + " AND " + query.y1 + " LIMIT 100000 ";

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
