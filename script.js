
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
let terminalContainer = document.getElementById("terminal-container");

let cm;
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

      if (lang.packages) {
        document.getElementById("packages").style.display = "block";
      } else {
        document.getElementById("packages").style.display = "none";
      }

      if (lang.noshell) {

        const modeScript = document.createElement("script");
        modeScript.src = `codemirror/mode/${encodeURIComponent(lang.name)}/${encodeURIComponent(lang.name)}.js`;
        document.body.appendChild(modeScript);

        cm = CodeMirror(document.getElementById("editor"), {
          lineNumbers: true,
          gutter: true,
          lineWrapping: true,      
          readOnly: true,
          mode: lang.name
        });

        cm.setSize("100%", "100%");
        cm.setValue(lang.hello_world);

        document.getElementById("editor-container").style.display = "block";

        button.onclick = (e) => {

          cm.setOption("readOnly", false);
          document.getElementById("editor-submit-code").disabled = false;

          start_timer();
          e.target.style.display = "none";

          setTimeout(() => {

            done();

            cm.setOption("readOnly", true);
            document.getElementById("editor").classList.add("editor-locked");

          }, 60000);

        }

      } else {

        button.onclick = start_ws;

      }

    }

    // Add language to the list

    if (!lang.hidden) {
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
    }
    
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

});

function done() {

  clearInterval(interval);
  
  timer.style.width = "100%";
  timer.classList.add("flashing");
  button.style.display = "inline-block";
  isTerminalOn = false;

}

function start_timer() {
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

  return interval;

}

function start_ws(e, path) {

  if (isTerminalOn) {
    return;
  }

  isTerminalOn = true;

  terminalContainer.classList.remove("inactive");
  terminal.innerHTML = ""; // Clear if run twice.
  button.style.display = "none";

  start_timer();

  const term = new Terminal();
  let socket;

  try {
    socket = new WebSocket(
      `${document.location.protocol === "http:" ? "ws" : "wss"}://${
        apiHost
      }/${ path || "ws/" + current_language }`
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

  const addPackage = (name) => {

    socket.send(
      [
        "__CLIENT_EVENT",
        "PACKAGE",
        "add",
        btoa(name)
      ].join("|")
    )

  }

  const removePackage = (name) => {
    socket.send(
      [
        "__CLIENT_EVENT",
        "PACKAGE",
        "remove",
        btoa(name)
      ].join("|")
    )
  }

  const listPackages = () => {
    socket.send(
      [
        "__CLIENT_EVENT",
        "PACKAGE",
        "list"
      ].join("|")
    )
  }

  document.getElementById("package-add").onclick = () => addPackage(document.getElementById("package").value);
  document.getElementById("package-remove").onclick = () => removePackage(document.getElementById("package").value);
  document.getElementById("package-list").onclick = listPackages;

  return socket

}

document.getElementById("editor-submit-code").onclick = async (e) => {
  
  let response;
  e.target.innerText = "Loading...";

  try {
    response = await fetch(

      location.protocol + "//" + apiHost + "/exec_noshell",
      {
        
        method: 'POST',
        headers: {
          'Content-Type': "application/json"
        },

        body: JSON.stringify({

          language: current_language,
          code: cm.getValue()
          
        })

      }

    )
  } catch (e) {

    console.error(e);

    document.getElementById("error").style.display="block";
    document.getElementById("error").innerText = "Sorry, there was an error contacting the server.";
    return;
    
  }

  const json = await response.json();
  if (!json.success) {

    document.getElementById("error").style.display="block";
    document.getElementById("error").innerText = json.message;
    return;

  }


  document.getElementById("editor-container").style.display = "none";
  const socket = start_ws(null, `ws/_exec/${json.id}`);

}