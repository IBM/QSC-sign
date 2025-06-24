/**
  * A class transforming Hex signatures to URLs and viceversa
  */
class Signature {
    static SQISIGN = 1;
    static MAYO = 2;
    static UOV = 3;
    static FAEST = 4;
    static maxURLLength = 2200;
    static algorithmMeta = new Map([
	[Signature.SQISIGN , {
	    id : 'sqisign',
	    name : 'SQIsign',
	    chunks : 1,
	}],
	[Signature.MAYO , {
	    id : 'mayo',
	    name : 'MAYO',
	    chunks : 1,
	}],
	[Signature.UOV , {
	    id : 'uov',
	    name : 'UOV',
	    chunks : 1,
	}],
	[Signature.FAEST , {
	    id : 'faest',
	    name : 'FAEST',
	    chunks : 2,
	}],
    ]);

    static hex2b64(hex) {
	const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
	return btoa(String.fromCharCode(...bytes));
    }
    
    static b642hex(b64) {
	const raw = atob(b64);
	let result = '';
	for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
	}
	return result;
    }
    
    static b642bin(b64) {
	return Uint8Array.from(atob(b64), (b) => b.charCodeAt(0));
    }
    
    constructor(algorithm, dataHex, origin) {
	if (!Signature.algorithmMeta.has(algorithm))
	    throw `Unkwnown algorithm ${algorithm}`;
	this.algorithm = algorithm;
	this.origin = origin;
	const dataDec = dataHex ? Signature.hex2b64(dataHex) : '';
	this.data = [];

	if (dataDec.length > 0){
		var chunk_len = Math.ceil(dataDec.length / this.chunks())
		for (let i = 0; i < this.chunks(); i ++){
			this.data.push(dataDec.slice(i * chunk_len, (i + 1) * chunk_len));
		}
	}
    }

    get meta() {
	return Signature.algorithmMeta.get(this.algorithm);
    }
    
    chunks() {
	return this.meta.chunks;
    }

    isComplete() {
	console.log(this.data.reduce((x) => x+1, 0), this.chunks());
	return this.data.reduce((x) => x+1, 0) == this.chunks();
    }

    hexData() {
	return Signature.b642hex(
	    this.data.reduce((acc, chunk) => acc + chunk, ''));
    }

    binData() {
	return Signature.b642bin(
	    this.data.reduce((acc, chunk) => acc + chunk, ''));
    }

    toString() {
	return `${this.meta.name}(${this.hexData()})`;
    }
    
    *URLs() {
	for (let [i, chunk] of this.data.entries()) {
	    if (chunk !== undefined) {
		yield this.origin + '?' + this.algorithm + i + chunk;
	    }
	}
    }

    static fromURL(url) {
	const u = new URL(url);
	const sig = new Signature(parseInt(u.search[1]), '');
	sig.addDataFromURL(url);
	return sig;
    }

    addDataFromURL(url) {
	const u = new URL(url);
	if (parseInt(u.search[1]) != this.algorithm)
	    throw `Algorithm mismatch: ${u.search[1]} != ${this.algorithm}`;
	const chunk = parseInt(u.search[2]);
	if (isNaN(chunk) || chunk >= this.meta.chunks)
	    throw `Invalid chunk index ${chunk}`;
	const data = u.search.substring(3);
	if (data.match(/^[A-Za-z0-9+/]+=*$/) === null)
	    throw `Invalid data format: must be base64`;
	this.data[chunk] = data;
    }
}

export { Signature };
