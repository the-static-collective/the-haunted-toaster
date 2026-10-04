#!/usr/bin/env node
"use strict";

const fs=require("node:fs");
const path=require("node:path");
const {frozenFixture}=require("../tests/helpers/franken-plan-fixture.cjs");
const {compileRemotionFranken}=require("../src/franken-composer/projectors/remotion.cjs");

const root=path.resolve(__dirname,"../../..");
const experiment=path.join(root,"experiments","franken-composer-remotion");
const publicAssets=path.join(experiment,"public","assets");
fs.mkdirSync(publicAssets,{recursive:true});

const f=frozenFixture();
const rebound={};
for(const [id,file] of Object.entries(f.assetBindings)){
  if(!file)continue;
  const ext=path.extname(file)||".bin";
  const name=`${id.replace(/[^A-Za-z0-9_.-]+/g,"-")}${ext}`;
  fs.copyFileSync(file,path.join(publicAssets,name));
  rebound[id]=`assets/${name}`;
}

const out=compileRemotionFranken({plan:f.plan,planHash:f.planHash,assetBindings:rebound});
fs.writeFileSync(path.join(experiment,"src","bundle.json"),JSON.stringify(out.bundle,null,2)+"\n");
process.stdout.write(JSON.stringify({planHash:f.planHash,projectionHash:out.projectionHash},null,2)+"\n");
