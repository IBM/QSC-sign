import { backend } from "./config.mjs";
import { Signature } from "./common.mjs"

const welcomeContainer = document.getElementById('welcome-container');
const incompleteSignatureContainer = document.getElementById('incomplete-signature-container');
const scannerContainer = document.getElementById('scanner-container');
const resultContainer = document.getElementById('result-container');
const haveCredentialBtn = document.getElementById('have-credential-btn');
const resultMessage = document.getElementById('result-message');
const resultName = document.querySelector('#result-type a');
const resultPK = document.getElementById('result-pk');
const resultSig = document.getElementById('result-sig');
const faestMessage = document.getElementById('faest-message');
const manualEntry = document.getElementById('manual-entry');
const manualInput = document.getElementById('manual-input');
const manualSubmit = document.getElementById('manual-submit');
const ibmLogo = document.getElementById('ibm-logo');
const vaultImg = document.getElementById('vault-img');
const vaultResultImg = document.getElementById('vault-result-img');
const useCameraApp = document.getElementById('use-camera-app')

const storage = localStorage;

const containers = [
    welcomeContainer,
    incompleteSignatureContainer,
    scannerContainer,
    resultContainer
];

function showContainer(container) {
    containers.forEach(c => c.style.display = 'none');
    container.style.display = 'block';
    console.log("show:", container.id)
}

let qrReader = null;
let codeReader = null;
let videoInputDeviceId = null;

haveCredentialBtn.onclick = () => {
    startScanner();
    setTimeout(() => {
        useCameraApp.style.display = 'block';
    }, 6000);
};

function handleCredential(decodedText) {
    
    let sig = Signature.fromURL(decodedText);

    if (sig.isComplete()) {
        storage.removeItem('stored_URL'); 
        verifyCredential(sig);
        return;
    }

    // try to combine with stored URL (assumes at most 2 chunks)
    let stored_URL = storage.getItem('stored_URL') || null;
    if ( stored_URL ){
        sig.addDataFromURL(stored_URL);
        if (sig.isComplete()) {
            
            verifyCredential(sig);
            return;
        }
    }

    // incomplete signature, store for later
    storage.setItem('stored_URL', decodedText);
	showContainer(incompleteSignatureContainer);
}

function startScanner() {
    const video = document.getElementById('qr-video');
    video.style.display = '';
    if (!codeReader) {
        codeReader = new ZXing.BrowserQRCodeReader();
    } else {
        codeReader.reset();
    }
    codeReader.getVideoInputDevices().then(videoInputDevices => {
        // Prefer a camera with 'back' or 'environment' in its label, otherwise use the first
        let backCamera = videoInputDevices.find(device =>
                /back|environment/i.test(device.label)
        );
        videoInputDeviceId = (backCamera || videoInputDevices[0])?.deviceId;
        codeReader.decodeFromVideoDevice(videoInputDeviceId, video, (result, err) => {
            if (result) {
                // Stop scanning
                codeReader.reset();
                video.style.display = 'none';
		try {
            handleCredential(result.getText());
		} catch (err) {
		    console.log(err);
		    throw err;
		}
            }
            // ignore errors (err) for now
        });
    });
    showContainer(scannerContainer);
}

// If you want to stop the scanner manually:
function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        document.getElementById('qr-video').style.display = 'none';
    }
}

async function injectPK(sig, node) {
    const anchor = node.querySelector('a');
    anchor.href = `public_keys/${sig.meta.id}_public.key`;
    const pk = (await (await fetch(anchor.href)).bytes());
    node.querySelector('.bindata').textContent = pk.reduce(
	(hex, b) => hex + ' ' + b.toString(16).padStart(2, '0'), '').toUpperCase();
    node.querySelector('.size').textContent = pk.length;
}

function injectSig(sig, node) {
    const binSig = new Blob([sig.binData()], { type: 'application/data' });
    const anchor = node.querySelector('a');
    anchor.href = URL.createObjectURL(binSig);
    anchor.download = `${sig.meta.id}_credential.sig`;
    node.querySelector('.bindata').textContent = sig.hexData().toUpperCase()
	.match(/.{1,2}/g).reduce((x,y) => x+" "+y, "");
    node.querySelector('.size').textContent = binSig.size;
}

function verifyCredential(sig) {
    showContainer(resultContainer);
    resultMessage.textContent = "Verifying credential...";
    resultName.textContent = sig.meta.name;
    resultName.href = '#' + sig.meta.id;
    injectPK(sig, resultPK);
    injectSig(sig, resultSig);
    stopScanner();
    scannerContainer.style.display = 'none';

    setTimeout(() => {
        fetch(backend + '/api/verify/' + sig.meta.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
	    signature: sig.hexData(),
	    })
        })
        .then(async response => {
            const data = await response.json();
            resultContainer.style.display = '';
            if (response.ok && data.name && data.secret) {
                vaultResultImg.src = "vault_open.jpg";
                vaultResultImg.alt = "Vault Open";
                resultMessage.innerHTML = `<span style="color:#198038;">Welcome <b>${data.name}</b>, the answer is: <b>${data.secret}</b></span>`;
            } else {
                vaultResultImg.src = "vault_closed.jpg";
                vaultResultImg.alt = "Vault Closed";
                resultMessage.innerHTML = `<span style="color:#da1e28;">Verification failed: ${data.error || 'Invalid credential.'}${ data.debug ? "<br><pre style='font-size:0.9em;'>" + JSON.stringify(data.debug, null, 2) + "</pre>" : ""}</span>`;
            }
        })
        .catch(e => {
            resultContainer.style.display = '';
            vaultResultImg.src = "vault_closed.jpg";
            vaultResultImg.alt = "Vault Closed";
            resultMessage.innerHTML = `<span style="color:#da1e28;">Verification failed: ${e.message}</span>`;
        });
    }, 2500);
}

// Manual entry is hidden by default, only shown when IBM logo is clicked
ibmLogo.onclick = () => {
    if (manualEntry.style.display === "none") {
        manualEntry.style.display = "";
        manualInput.focus();
    }
};

manualSubmit.onclick = () => {
    const value = manualInput.value.trim();
    if (!value) return;
    handleCredential(value);
};
manualInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        manualSubmit.click();
    }
});


document.addEventListener('DOMContentLoaded', function() {
  if (location.search) {
      handleCredential(location.href);
  }
}, false);
