
// Specify custom API with ?useAPI=my-api-host.com
const usp = new URLSearchParams(location.search);
const apiHost = usp.get("useAPI") || "60api.srg.id.au"
const path = usp.get("language") || "_interactive_terminal";

const socket = new WebSocket(
    `${document.location.protocol === "http:" ? "ws" : "wss"}://${
      apiHost
    }/ws/${path}`
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

        if (e.data.includes("__ISHELL_EVNT")) {

            const event = e.data.split("|");
            window.location.href = `?useAPI=${apiHost}&language=${event[2]}`;

        }
        
    });

}