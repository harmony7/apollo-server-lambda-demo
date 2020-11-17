const fs = require('fs');

const {
    name,
    dependencies,
} = JSON.parse( fs.readFileSync('package.json', 'utf-8') );

const newPackage = {
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "keywords": [],
    "author": "",
};

Object.assign(newPackage, {
    name,
    dependencies,
});

fs.writeFileSync( './build/package.json', JSON.stringify(newPackage, null, 2), 'utf-8' );
