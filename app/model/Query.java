package model;

public class Query {
    public String start;
    public String end;
    public double x0;
    public double y0;
    public double x1;
    public double y1;

    @Override
    public String toString() {
        return "\n==== Query ====\n"
                + "start = " + this.start + "\n"
                + "end = " + this.end + "\n"
                + "x0 = " + this.x0 + "\n"
                + "y0 = " + this.y0 + "\n"
                + "x1 = " + this.x1 + "\n"
                + "y1 = " + this.y1 + "\n";
    }
}
