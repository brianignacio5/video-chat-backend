var socket = io.connect("/");

var answersFrom = {};

var perrConnection = new RTCPeerConnection();

perrConnection.ontrack = function ({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

// If video or audio permission is not granted/ available
// getUserMedia will throw a NotFoundError
var constrains = { video: true, audio: true };

async function getUserMedia() {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constrains);
    let video = document.getElementById("local-video");
    if (video) {
      video.srcObject = stream;
    }
    stream.getTracks().forEach((track) => {
      perrConnection.addTrack(track, stream);
    });
  } catch (error) {
    errHandler(error);
  }
}
getUserMedia();

async function createOffer(id) {
  try {
    const offer = await perrConnection.createOffer();
    await perrConnection.setLocalDescription(new RTCSessionDescription(offer));
    socket.emit("makeOffer", {
      offer: offer,
      to: id,
    });
  } catch (error) {
    errHandler(error);
  }
}

function errHandler(err) {
  console.warn("Error", err);
  if (err.name == "NotFoundError" || err.name == "DevicesNotFoundError") {
    //required track is missing
  } else if (err.name == "NotReadableError" || err.name == "TrackStartError") {
    //webcam or mic are already in use
  } else if (
    err.name == "OverconstrainedError" ||
    err.name == "ConstraintNotSatisfiedError"
  ) {
    //constraints can not be satisfied by avb. devices
  } else if (
    err.name == "NotAllowedError" ||
    err.name == "PermissionDeniedError"
  ) {
    //permission denied in browser
  } else if (err.name == "TypeError" || err.name == "TypeError") {
    //empty constraints object
  } else {
    //other errors
  }
}

socket.on("addUsers", function (data) {
  for (var i = 0; i < data.users.length; i++) {
    var id = data.users[i];
    const alreadyExistingUser = document.getElementById(id);
    if (!alreadyExistingUser) {
      var el = document.createElement("div");

      el.setAttribute("id", id);
      el.innerHTML = id;
      el.addEventListener("click", function () {
        createOffer(id);
      });
      document.getElementById("users").appendChild(el);
    }
  }
});

socket.on("removeUser", function (id) {
  var userEl = document.getElementById(id);
  if (userEl) {
    document.getElementById("users").removeChild(userEl);
  }
});

socket.on("offerMade", async function (data) {
  try {
    await perrConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    const answer = await perrConnection.createAnswer();
    await perrConnection.setLocalDescription(new RTCSessionDescription(answer));
    socket.emit("makeAnswer", {
      answer: answer,
      to: data.socket,
    });
  } catch (error) {
    errHandler(error);
  }
});

socket.on("answerMade", async function (data) {
  try {
    await perrConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );
    document.getElementById(data.socket).setAttribute("class", "active");
    if (!answersFrom[data.socket]) {
      await createOffer(data.socket);
      answersFrom[data.socket] = true;
    }
  } catch (error) {
    errHandler(error);
  }
});
