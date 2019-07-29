package controllers;

import actor.DBConnector;
import play.libs.streams.ActorFlow;
import play.mvc.*;
import akka.actor.*;
import akka.stream.*;
import javax.inject.Inject;
import com.typesafe.config.Config;

/**
 * This controller contains an action to handle HTTP requests
 * to the application's home page.
 */
public class HomeController extends Controller {

    private final Config config;
    private final ActorSystem actorSystem;
    private final Materializer materializer;

    @Inject
    public HomeController(Config config, ActorSystem actorSystem, Materializer materializer) {
        this.config = config;
        this.actorSystem = actorSystem;
        this.materializer = materializer;
    }

    /**
     * An action that renders an HTML page with a welcome message.
     * The configuration in the <code>routes</code> file means that
     * this method will be called when the application receives a
     * <code>GET</code> request with a path of <code>/</code>.
     */
    public Result index() {
        return ok(views.html.index.render());
    }

    public WebSocket ws() {
        return WebSocket.Json.accept(
                request -> ActorFlow.actorRef((actorRef) -> DBConnector.props(actorRef, config), actorSystem, materializer));
    }

}
