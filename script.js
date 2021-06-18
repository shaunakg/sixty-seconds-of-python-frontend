
// 
// Sixty Seconds of Python
// Under MIT Licence
// 

const usp = new URLSearchParams(window.location.search);

// Specify custom API with ?useAPI=my-api-host.com
const apiHost = usp.get("useAPI") || "60api.srg.id.au"

let isTerminalOn = false;
let timeLeft = 1;
let totalTime = 60;
let interval = null;
let terminal = document.getElementById("terminal");

let messages = [];

let timer = document.getElementById("timer");
let button = document.getElementById("start-btn");

const current_language = usp.get('lang') || usp.get('language') || 'Python3';
const current_language_data = {};

const languages = document.getElementById("languages");

document.querySelectorAll(".lang").forEach(e => {

  e.innerText = current_language;

});

fetch(window.location.protocol + "//" + apiHost + "/meta/languages").then(r => r.json()).then(j => {

  document.getElementById("howmany").innerText = j.length;
  const names = j.map( l => l.name );

  j.forEach(lang => {

    if (lang.name === current_language) {

      // We have our language, now do language-specific things
      // Check if interactive or not

      if (lang.noshell) {

        let editor = monaco.editor.create(
          document.getElementById("editor"),
          {
            language: lang.name.toLowerCase(), // In case there is a syntax handler for our language
            theme: "vscode-dark",
            readOnly: true,
            value: [
              "Enter your code here (delete this line)."
            ]
          }
        )

        document.getElementById("editor-container").style.display = "block";
        button.onclick = () => {

          editor.updateOptions({
            readOnly: false
          })

        }

      } else {

        button.onclick = start_ws;

      }

    }

    // Add language to the list

    langLi = document.createElement("div");
    langLi.classList.add("language");

    langImg = document.createElement("img");
    langImg.src = lang.image;
    langLi.appendChild(langImg);

    langLink = document.createElement("a");
    langLink.innerText = lang.name;
    langLink.href = `?language=${encodeURIComponent(lang.name)}&useAPI=${encodeURIComponent(apiHost)}`;
    langLink.title = lang.description;

    langLink.classList.add("language-link");

    langLi.appendChild(langLink)
    languages.appendChild(langLi);
    
  });

  if (!names.includes(current_language)) {

    document.getElementById("error").style.display="block";
    document.getElementById("error").innerText = `Your chosen language, "${current_language}", is not supported. Please pick another from the menu above.`;

    button.style.display = "none";
    isTerminalOn = true;
    timer.style.width = "100%";
    isTerminalOn = false;

    timer.classList.add("flashing");
    timer.style.backgroundColor = "red";

    return;

  }

  document.getElementById("loading-languages").style.display = "none";

}).catch(error => {

  document.getElementById("loading-languages").style.display = "none";

  console.error(error);
  languages.innerHTML = "<span style='color:red'>[error]</span>";

})

function done() {
  clearInterval(interval);
  timer.style.width = "100%";
  timer.classList.add("flashing");
  button.style.display = "inline-block";
  isTerminalOn = false;
}

function start_ws() {

  if (isTerminalOn) {
    return;
  }

  isTerminalOn = true;

  terminal.classList.remove("inactive");
  terminal.innerHTML = ""; // Clear if run twice.
  button.style.display = "none";

  timer.classList.remove("flashing");
  document.getElementById("error").style.display="none";
  timer.style.width = "100%";
  timeLeft = 1;

  interval = setInterval(() => {

    if (timeLeft < 0) {
      return done();
    }

    timer.style.width = (timeLeft * 100) + "%";
    timeLeft -= 1/totalTime;

  }, 1000);

  const term = new Terminal();
  let socket;

  try {
    socket = new WebSocket(
      `${document.location.protocol === "http:" ? "ws" : "wss"}://${
        apiHost
      }/ws/${current_language}`
    );
  } catch (e) {

    document.getElementById("error").style.display="block";
    clearInterval(interval);
    timer.style.width = "100%";
    button.style.display = "inline-block";
    isTerminalOn = false;

    timer.classList.add("flashing");
    timer.style.backgroundColor = "red";

    return;

  }

  socket.onerror = () => {

    document.getElementById("error").style.display="block";
    clearInterval(interval);
    timer.style.width = "100%";
    button.style.display = "inline-block";
    isTerminalOn = false;

    timer.classList.add("flashing");
    timer.style.backgroundColor = "red";

    return;

  }

  socket.onopen = () => {

    const websocketAddon = new AttachAddon.AttachAddon(socket);
    const resizeAddon = new FitAddon.FitAddon();

    term.loadAddon(websocketAddon);
    term.loadAddon(resizeAddon);

    term.open(terminal);

    resizeAddon.fit();
    window.addEventListener("resize", () => resizeAddon.fit());

    socket.addEventListener("message", e => {

      if (e.data == "__TERMEXIT") {

        return done();

      }

    })

  }

}
