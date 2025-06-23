/**
  * A class transforming Hex signatures to URLs and viceversa
  */
class Signature {
    static SQISIGN = 1;
    static MAYO = 2;
    static UOV = 3;
    static FAEST = 4;
    static maxURLLength = 5400;
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
    
    constructor(algorithm, dataHex, origin) {
	if (!Signature.algorithmMeta.has(algorithm))
	    throw `Unkwnown algorithm ${algorithm}`;
	this.algorithm = algorithm;
	this.origin = origin;
	const dataDec = dataHex ? BigInt('0x' + dataHex).toString(10) : '';
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
	return BigInt(this.data.reduce((acc, chunk) => acc + chunk, '')).toString(16);
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
	if (data.match(/^[0-9]+$/) === null)
	    throw `Invalid data format: must be [0-9]+`;
	this.data[chunk] = BigInt(data);
    }
}

export { Signature };
