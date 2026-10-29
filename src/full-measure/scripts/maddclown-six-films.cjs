#!/usr/bin/env node
"use strict";
const {perform}=require("../src/bridge/maddclown-film-festival.cjs");
perform(process.argv.slice(2))
 .then(result=>process.stdout.write(JSON.stringify(result,null,2)+"\n"))
 .catch(error=>{process.stderr.write("HOLD: "+String(error.message||error).slice(0,3000)+"\n");process.exitCode=2});
