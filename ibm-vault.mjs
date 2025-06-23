import { Signature } from "./common.mjs"

const welcomeContainer = document.getElementById('welcome-container');
const scannerContainer = document.getElementById('scanner-container');
const resultContainer = document.getElementById('result-container');
const haveCredentialBtn = document.getElementById('have-credential-btn');
const resultMessage = document.getElementById('result-message');
const faestMessage = document.getElementById('faest-message');
const manualEntry = document.getElementById('manual-entry');
const manualInput = document.getElementById('manual-input');
const manualSubmit = document.getElementById('manual-submit');
const ibmLogo = document.getElementById('ibm-logo');
const vaultImg = document.getElementById('vault-img');
const vaultResultImg = document.getElementById('vault-result-img');

// State to keep track of multi-qr signatures
let sig = null;
let qrReader = null;
let codeReader = null;
let videoInputDeviceId = null;

haveCredentialBtn.onclick = () => {
    welcomeContainer.style.display = 'none';
    scannerContainer.style.display = 'block';
    resultContainer.style.display = 'none';
    startScanner();
};

function handleCredential(decodedText) {
    // Handle split QR codes
    if (sig)
	sig.addDataFromURL(decodedText);
    else
	sig = Signature.fromURL(decodedText);

    if (sig.isComplete()) {
	verifyCredential();
    } else {
	// Assuming at mots 2 QR codes per sig
	const [have, want] = sig.data[0] ? ['First', 'second'] : ['Second', 'first'];
        faestMessage.innerHTML = `<span style="color:#198038;">${have} part of ${sig.meta.name} credential scanned.<br>Now please scan the ${want} part.</span>`;
        startScanner();
    }
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
}

// If you want to stop the scanner manually:
function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        document.getElementById('qr-video').style.display = 'none';
    }
}

function verifyCredential(decodedText) {
    resultMessage.textContent = "Verifying credential...";
    stopScanner();
    scannerContainer.style.display = 'none';

    fetch('/api/verify-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
	    algorithm: sig.algorithm,
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

    // Reset reader state
    sig = null;
}

// Manual entry is hidden by default, only shown when IBM logo is clicked
ibmLogo.onclick = () => {
    if (manualEntry.style.display === "none") {
        manualEntry.style.display = "";
        manualInput.focus();
    } else {
        manualEntry.style.display = "none";
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
