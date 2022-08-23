const argv = require("yargs").argv;
const fs = require("fs");
const generateFrames = require("gif-to-png");
const compressing = require("compressing");

var index = 0;

const conf = {
  out_folder: "build/raw/",
  fonts_folder: "assets/minecraft/font",
  textures_folder: "assets/minecraft/textures",
  font: {
    providers: [],
  },
  gifs: [],
};

// Display help for command
if (argv.h) {
  console.log("Help to script");
  console.log("-c Clean build");
  return;
}

// Cleaning build
if (argv.r) {
  console.log("Cleaning build...");
  if (fs.existsSync("build/")) fs.rmSync("build/", { recursive: true });
  fs.mkdirSync(conf.out_folder, { recursive: true });
  console.log("Cleaning build");
}

// Make a build folder
if (!fs.existsSync(conf.out_folder)) {
  fs.mkdirSync(conf.out_folder);
}

// Make a structure
fs.mkdirSync(conf.out_folder + conf.fonts_folder, { recursive: true });
fs.mkdirSync(conf.out_folder + conf.textures_folder, { recursive: true });

// Main function
async function gifs() {
  // Read gifs
  fs.readdirSync("gifs/").forEach((name) => {
    conf.gifs.push("gifs/" + name);
  });

  for (let gif of conf.gifs) {
    await writeGif(gif);
  }

  fs.writeFileSync(
    conf.out_folder + conf.fonts_folder + "/default.json",
    JSON.stringify(conf.font).replace(/\\\\/g, "\\"),
    { encoding: "utf8" }
  );

  fs.writeFileSync(
    conf.out_folder + "pack.mcmeta",
    JSON.stringify({
      pack_format: argv.v || 9,
      ...JSON.parse(fs.readFileSync("resources/pack.mcmeta")),
    }),
    { encoding: "utf-8" }
  );
  fs.copyFileSync("resources/pack.png", conf.out_folder + "pack.png");

  console.log(`Resource pack generated!, ${__dirname}/${conf.out_folder}`);

  // Compress
  if (argv.z) {
    console.log("Compressing...");
    let fileName = argv.z != true ? argv.z + ".zip" : "ImagesCompiler.zip";
    compressing.zip
      .compressDir(conf.out_folder + "./", `./build/${fileName}`)
      .then(() => {
        console.log("Compression finished!");
      });
  }
}

async function writeGif(path) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(".temp/")) fs.mkdirSync(".temp/");
    generateFrames(path, ".temp/").then(async (url) => {
      await savePngs(url);
      index += url.length;
      fs.rmSync(".temp/", { recursive: true });
      resolve();
    });
  });
}

async function savePngs(list) {
  new Promise((done, err) => {
    list.map((frame) => {
      frame = frame
        .replace(".temp\\", "")
        .replace("frame", "")
        .replace(".png", "");
      // push into font config
      conf.font.providers.push({
        type: "bitmap",
        file: `minecraft:${resolveName(`${index + parseInt(frame)}.png`)}`,
        ascent: parseInt(argv.a || 10),
        height: parseInt(argv.b || 20),
        chars: [resolveUnicode(index + parseInt(frame) - 1)],
      });

      // Move image from .temp to textures
      fs.rename(
        `.temp\\frame${frame}.png`,
        conf.out_folder +
          conf.textures_folder +
          "/" +
          resolveName(`${index + parseInt(frame)}.png`),
        () => {
          done();
        }
      );
    });
  });
}

function resolveUnicode(num) {
  if (num < 10) return "\\uE00" + num;
  if (num < 100) return "\\uE0" + num;
  if (num < 1000) return "\\uE" + num;
}
function resolveName(name) {
  if (name.length < 6) return "000" + name;
  if (name.length < 7) return "00" + name;
  if (name.length < 8) return "0" + name;
  return name;
}

gifs();
