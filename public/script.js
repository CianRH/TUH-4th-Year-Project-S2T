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
let deleteButton = document.querySelector("#delete-button");
let saveButton = document.getElementById("save-button");
let urgentCheckbox = document.getElementById("urgencyCheckbox");

let formName;
let number;
let nameInput = document.querySelector("#name-input");
let numberInput = document.querySelector("#number-input");
let form = document.querySelector("#my-form");

function setAudioSource(fileKey) {
    fetch(`/get-audio?key=${encodeURIComponent(fileKey.replace('.txt', ''))}`)
    .then((response) => response.blob())
    .then((blob) => {
      let audioURL = URL.createObjectURL(blob);
      let audioPlayer = document.getElementById("audio-player");
      audioPlayer.src = audioURL;
    })
    .catch((error) => console.log(error));
}

if (searchButton){
    searchButton.addEventListener("click", function () {
        const keyword = searchInput.value.trim().toLowerCase();

        let textEditor = document.querySelector("#text-editor");
        textEditor.value = "Content of transcription file will appear here when clicked";
    

        if (keyword.length > 0) {
          fetch(`/search-bucket?keyword=${encodeURIComponent(keyword)}`)
            .then((response) => response.json())
            .then((data) => {
                let list = document.querySelector("#table-list tbody");
                list.innerHTML = "";
                data.forEach((file) => {
                  if (file && file.key && file.url) {
                    let listItem = document.createElement("tr");
                    listItem.setAttribute("data-key", file.key);
                    let cell = document.createElement("td");
                    let link = document.createElement("a");
                    link.textContent = file.key;
                    link.href = file.url;
                    link.download = file.key;
                    
                    link.addEventListener("click", function (event) {
                        event.preventDefault();
                        const previousActiveRow = document.querySelector("#table-list tbody tr.active");
                        if (previousActiveRow) {
                            previousActiveRow.classList.remove("active");
                        }

                        setAudioSource(file.key)
                        
                        listItem.classList.add("active");
                        fetch(`/get-file-content?key=${encodeURIComponent(file.key)}`)
                          .then((response) => response.text())
                          .then((content) => {
                            let textEditor = document.querySelector("#text-editor")
                            textEditor.value = content
                            textEditor.removeAttribute("readonly")

                            saveButton.removeAttribute("disabled")
                          })
                          .catch((error) => console.log(error));
                     });
              
                    cell.appendChild(link);
                    listItem.appendChild(cell);
                    list.appendChild(listItem);
                  }
                });
              })
              
            .catch((error) => console.log(error));
        } else {
            fetch("/list-bucket")
            .then((response) => response.json())
            .then((data) => {
                let list = document.querySelector("#table-list tbody");
                list.innerHTML = "";
                data.forEach((file) => {
                  if (file && file.key && file.url) {
                    let listItem = document.createElement("tr");
                    listItem.setAttribute("data-key", file.key);
                    let cell = document.createElement("td");
                    let link = document.createElement("a");
                    link.textContent = file.key;
                    link.href = file.url;
                    link.download = file.key;
              
                    link.addEventListener("click", function (event) {
                        event.preventDefault();
                        const previousActiveRow = document.querySelector("#table-list tbody tr.active");
                        if (previousActiveRow) {
                            previousActiveRow.classList.remove("active");
                        }    
                      
                        listItem.classList.add("active");

                        fetch(`/get-file-content?key=${encodeURIComponent(file.key)}`)
                          .then((response) => response.text())
                          .then((content) => {
                            let textEditor = document.querySelector("#text-editor");
                            textEditor.value = content;
                            textEditor.removeAttribute("readonly");

                            saveButton.removeAttribute("disabled")

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

                        cell.appendChild(link);
                        listItem.appendChild(cell);
                        list.appendChild(listItem);
                    }
                });
        })
        }
      });
}

if (saveButton) {
    saveButton.addEventListener("click", function () {
      const currentFile = document.querySelector("#table-list tbody tr.active");
      
      if (currentFile) {
        const key = currentFile.getAttribute("data-key");
        const editedContent = document.getElementById("text-editor").value;

        console.log("Sending edited content:", editedContent);

  
        fetch(`/save-edited-content`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `key=${encodeURIComponent(key)}&content=${encodeURIComponent(editedContent)}`,
          })
          .then((response) => {
            if (response.ok) {
                alert("Transcription saved successfully!")

                saveButton.setAttribute("disabled")
            } else {
                alert("Error saving the updated transcription.")
            }
          })
          .catch((error) => console.log(error));
        }else {
            alert("No active transcription file is selected, please select one in the table above");
        }
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
            document.getElementById("recording-deleted").innerHTML = ""
            pauseButton.style.display = "inline-block";
            stopButton.style.display = "inline-block";
            downloadButton.setAttribute("disabled", true);
            deleteButton.setAttribute("disabled", true);
    
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
    pauseButton.style.display = "none";
    resumeButton.style.display = "inline-block";
});
}

if(resumeButton){
resumeButton.addEventListener("click", function () {
    mediaRecorder.resume();

    resumeButton.setAttribute("disabled", true);
    pauseButton.removeAttribute("disabled");
    pauseButton.style.display = "inline-block";
    resumeButton.style.display = "none";
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
    deleteButton.removeAttribute("disabled");
    pauseButton.style.display = "none";
    resumeButton.style.display = "none";
    recordButton.style.display = "none";
    stopButton.style.display = "none";
    deleteButton.style.display = "inline-block";
    downloadButton.style.display = "inline-block";
});
}

if(deleteButton){
    deleteButton.addEventListener("click", function() {
        recordedBlobs = [];
        deleteButton.setAttribute("disabled", true);
        downloadButton.setAttribute("disabled", true);
        recordButton.style.display = "inline-block";
        stopButton.style.display = "none";
        deleteButton.style.display = "none";
        downloadButton.style.display = "none";

        document.getElementById("recording-deleted").innerHTML = "Recording Deleted"

        urgencyCheckbox.checked = false;
        
    })
}

if(downloadButton){
downloadButton.addEventListener("click", function () {
    const blob = new Blob(recordedBlobs, { type: "audio/webm" });

    const urgentPrefix = urgencyCheckbox.checked ? "URGENT_" : "";

    const formData = new FormData();
    // this is whats being sent
    formData.append("audio", blob, urgentPrefix + "recording.webm");

    axios.post("/save-image", formData).then(response => {
        console.log("The recording has been saved to S3 at:", response.data);
    }).catch(error => {
        console.error("An error occurred while saving the recording to S3:", error);
    });

    downloadButton.setAttribute("disabled", true);
    deleteButton.setAttribute("disabled", true);
    recordButton.style.display = "inline-block";
    stopButton.style.display = "none";
    deleteButton.style.display = "none";
    downloadButton.style.display = "none";
    stopButton.style.display = "none";

    document.getElementById("recording-deleted").innerHTML = "Recording Uploaded"

    urgencyCheckbox.checked = false;

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