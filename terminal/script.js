
// Specify custom API with ?useAPI=my-api-host.com
const apiHost = (new URLSearchParams(location.search)).get("useAPI") || "60api.srg.id.au"

const socket = new WebSocket(
    `${document.location.protocol === "http:" ? "ws" : "wss"}://${
      apiHost
    }/ws/_interactive_terminal`
);

const term = new Terminal();

socket.onopen = () => {

    const websocketAddon = new AttachAddon.AttachAddon(socket);
    const resizeAddon = new FitAddon.FitAddon();

    term.loadAddon(websocketAddon);
    term.loadAddon(resizeAddon);

    term.open(document.getElementById("terminal"));

    resizeAddon.fit();
    window.addEventListener("resize", () => resizeAddon.fit());

    socket.addEventListener("message", e => {

        if (e.data == "__TERMEXIT") {
            return done();
        }

    })

}