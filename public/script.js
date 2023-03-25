let mediaRecorder;
let recordedBlobs = [];
let recordButton = document.querySelector("#start-recording-button");
let pauseButton = document.querySelector("#pause-recording-button");
let resumeButton = document.querySelector("#resume-recording-button");
let stopButton = document.querySelector("#stop-recording-button");
let downloadButton = document.querySelector("#download-recording-button");
let listButton = document.querySelector("#list-files");
let searchButton = document.querySelector("#search-button");
let searchInput = document.querySelector("#search-input");

let formName;
let number;
let nameInput = document.querySelector("#name-input");
let numberInput = document.querySelector("#number-input");
let form = document.querySelector("#my-form");

if (searchButton){
    searchButton.addEventListener("click", function () {
        const keyword = searchInput.value.trim();
        if (keyword.length > 0) {
          fetch(`/search-bucket?keyword=${encodeURIComponent(keyword)}`)
            .then((response) => response.json())
            .then((data) => {
                let list = document.querySelector("#list");
                list.innerHTML = "";
                data.forEach((file) => {
                  if (file && file.key && file.url) {
                    let listItem = document.createElement("li");
                    let link = document.createElement("a");
                    link.textContent = file.key;
                    link.href = file.url;
                    link.download = file.key;
              
                    link.addEventListener("click", function (event) {
                      event.preventDefault();
                      fetch(`/get-file-content?key=${encodeURIComponent(file.key)}`)
                        .then((response) => response.text())
                        .then((content) => {
                          let paragraph = document.querySelector("#paragraph");
                          paragraph.textContent = content;
                        })
                        .catch((error) => console.log(error));
                    });
              
                    listItem.appendChild(link);
                    list.appendChild(listItem);
                  }
                });
              })
              
            .catch((error) => console.log(error));
        }
      });
}

if (listButton) {
    listButton.addEventListener("click", function () {
        fetch("/list-bucket")
            .then((response) => response.json())
            .then((data) => {
                let list = document.querySelector("#list");
                list.innerHTML = "";
                data.forEach((file) => {
                    
                    if (file && file.key && file.url) {
                        let listItem = document.createElement("li");
                        let link = document.createElement("a");
                        link.textContent = file.key;
                        link.href = file.url;
                        link.download = file.key;

                        link.addEventListener("click", function (event) {
                            event.preventDefault();
                            fetch(`/get-file-content?key=${encodeURIComponent(file.key)}`)
                                .then((response) => response.text())
                                .then((content) => {
                                    let paragraph = document.querySelector("#paragraph");
                                    paragraph.textContent = content;

                                    // Fetch and set the audio source
                                    fetch(`/get-audio?key=${encodeURIComponent(file.key.replace('.txt', ''))}`)
                                        .then((response) => response.blob())
                                        .then((blob) => {
                                            let audioURL = URL.createObjectURL(blob);
                                            let audioPlayer = document.getElementById("audio-player");
                                            audioPlayer.src = audioURL;
                                        })
                                        .catch((error) => console.log(error));
                                })
                                .catch((error) => console.log(error));
                        });

                        listItem.appendChild(link);
                        list.appendChild(listItem);
                    }
                });
            })
            .catch((error) => console.log(error));
    });
}



if(recordButton){
    recordButton.addEventListener("click", function () {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            recordButton.setAttribute("disabled", true);
            pauseButton.removeAttribute("disabled");
            stopButton.removeAttribute("disabled");
    
            mediaRecorder.addEventListener("dataavailable", event => {
                if (event.data.size > 0) {
                    recordedBlobs.push(event.data);
                }
            });
        });
    });    
}

if(pauseButton){
pauseButton.addEventListener("click", function () {
    mediaRecorder.pause();
    //recordButton.removeAttribute("disabled");
    stopButton.removeAttribute("disabled");
    resumeButton.removeAttribute("disabled");
    pauseButton.setAttribute("disabled", true);
});
}

if(resumeButton){
resumeButton.addEventListener("click", function () {
    mediaRecorder.resume();

    resumeButton.setAttribute("disabled", true);
    pauseButton.removeAttribute("disabled");
});
}

if(stopButton){
stopButton.addEventListener("click", function () {
    mediaRecorder.stop();
    recordButton.removeAttribute("disabled");
    stopButton.setAttribute("disabled", true);
    downloadButton.removeAttribute("disabled");
    pauseButton.setAttribute("disabled", true);
    resumeButton.setAttribute("disabled", true);
});
}

if(downloadButton){
downloadButton.addEventListener("click", function () {
    const blob = new Blob(recordedBlobs, { type: "audio/webm" });

    const formData = new FormData();
    // this is whats being sent
    formData.append("audio", blob, "recording.webm");

    axios.post("/save-image", formData).then(response => {
        console.log("The recording has been saved to S3 at:", response.data);
    }).catch(error => {
        console.error("An error occurred while saving the recording to S3:", error);
    });

    downloadButton.setAttribute("disabled", true);

    recordedBlobs = [];
    //window.location.href = 'index.html';
});
}

document.onkeydown = function (e) {
    var key_press = e.key;
    var key_code = key_press.charCodeAt(0);

    console.log(key_press, key_code)
    if (key_code == "112") {
        if (recordButton.hasAttribute('disabled')) {
            stopButton.click();
            console.log(`Stopped\r\nKey Code value: ${key_code}`);
        } else {
            console.log(`Started\r\nKey Code value: ${key_code}`);
            recordButton.click();
        }
    }

    if (key_code == "114") {
        if (recordButton.hasAttribute('disabled') && pauseButton.hasAttribute('disabled')) {
            resumeButton.click();
            console.log(`Resumed\r\nKey Code value: ${key_code}`);
        } else {
            pauseButton.click();
            console.log(`Paused\r\nKey Code value: ${key_code}`);
        }
    }

    if (key_code == "117") {
        if (downloadButton.hasAttribute('disabled')) {
            console.log(`Upload not available`);
        } else {
            downloadButton.click();
            console.log(`Uploaded to s3\r\nKey Code value: ${key_code}`)
        }
    }
}