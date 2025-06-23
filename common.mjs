/**
  * A class transforming Hex signatures to URLs and viceversa
  */
class Signature {
    static SQISIGN = 1;
    static MAYO = 2;
    static UOV = 3;
    static FAEST = 4;
    static maxURLLength = 5500;
    static baseURLqr = 'HTTPS://PAGES.GITHUB.IBM.COM/QSC/SIGN';
    static baseURLvault = 'HTTPS://VAULT.EXAMPLE.COM/';
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
    
    constructor(algorithm, dataHex) {
	if (!Signature.algorithmMeta.has(algorithm))
	    throw `Unkwnown algorithm ${algorithm}`;
	this.algorithm = algorithm;
	const dataDec = dataHex ? BigInt('0x' + dataHex).toString(10) : '';
	this.data = [];
	for (let i = 0; i < dataDec.length; i += Signature.maxURLLength)
	    this.data.push(dataDec.slice(i, i + Signature.maxURLLength));
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
	return BigInt(this.data.reduce((acc, chunk) => acc + chunk, '')).toString(16);
    }

    toString() {
	return `${this.meta.name}(${this.hexData()})`;
    }
    
    *URLs() {
	for (let [i, chunk] of this.data.entries()) {
	    if (chunk !== undefined) {
		yield Signature.baseURLqr
		    + '?' + this.algorithm + i + chunk;
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
	if (data.match(/^[0-9]+$/) === null)
	    throw `Invalid data format: must be [0-9]+`;
	this.data[chunk] = BigInt(data);
    }
}

export { Signature };
