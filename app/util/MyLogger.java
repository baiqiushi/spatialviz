package util;

public class MyLogger {
    public static void info(Class c, String message) {
        System.out.println("[" + c.getName() + "] " + message);
    }

    public static void error(Class c, String message) {
        System.err.println("[" + c.getName() + "] " + message);
    }
}
