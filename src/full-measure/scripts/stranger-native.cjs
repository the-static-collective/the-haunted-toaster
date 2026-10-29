#!/usr/bin/env node
"use strict";
const {execute}=require("../src/bridge/jarvis-native.cjs");
execute(process.argv.slice(2))
 .then(result=>process.stdout.write(JSON.stringify(result,null,2)+"\n"))
 .catch(error=>{process.stderr.write("HOLD: "+String(error.stderr||error.message).slice(0,2000)+"\n");process.exitCode=2});
