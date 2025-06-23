import { backend } from "./config.mjs";

// UI functions
function setQR(node, uri, spinner, active, error, altText='') {
    node.classList.toggle('spinner', spinner);
    node.classList.toggle('active', active);
    node.classList.toggle('error', error);
    node.querySelector('img').src = uri;
    node.querySelector('img').alt = altText;
}
const waitQR = (node) => setQR(node, '', 1, 1, 0);
const placeQR = (node, uri) => setQR(node, uri, 0, 1, 0);
const errQR = (node) => setQR(node, '', 0, 1, 1, 'Error');

// API sign call
async function handleSignature(node, msg) {
    const apiUrl = node.dataset.api;
    const outputs = node.dataset.output
	  ? document.querySelectorAll(node.dataset.output)
	  : [ node ];
    
    outputs.forEach((qr) => waitQR(qr));
    
    try {
        const response = await fetch(backend + apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg ,
				   origin: new URL('.', window.location) })
        });
        const data = await response.json();
	const urls = data.dataUrls.values();
	
	for (let out of outputs)
            placeQR(out, urls.next().value);
    } catch (e) {
	for (let out of outputs)
            errQR(out);
    }
}

// Activate DOM
addEventListener('DOMContentLoaded', () => {
    // QR code generation
    const msgbox = document.querySelector('#message');
    const qrs = document.querySelectorAll('.qr[data-api]');
    document.querySelector('form').addEventListener('submit', (e) => {
        const msg = msgbox.value;
        if (msg.trim() !== '')
            qrs.forEach((qr) =>  handleSignature(qr, msg));

        e.preventDefault();
    });

    // QR code printing
    const print = document.querySelector('#print-area');
    document.querySelectorAll('.qr').forEach(
        (qr) => qr.addEventListener('click', (e) => {
            if (qr.classList.contains('active')) {
                // If this is a FAEST QR, print both FAEST codes
                if (qr.classList.contains('qr-faest')) {
                    const faest1 = document.getElementById('qrcode-faest1');
                    const faest2 = document.getElementById('qrcode-faest2');
                    const container = document.createElement('div');
                    if (faest1) container.appendChild(faest1.cloneNode(true));
                    if (faest2) container.appendChild(faest2.cloneNode(true));
                    print.contentDocument.body.replaceChildren(container);
                } else {
                    const copy = print.contentDocument.importNode(qr, true);
                    print.contentDocument.body.replaceChildren(copy);
                }
                print.contentWindow.print();
            }
        })
    );
});
