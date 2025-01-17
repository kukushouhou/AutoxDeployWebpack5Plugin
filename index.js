const http = require("http");
const path = require("path");
const fs = require('fs');

// const {Compiler} = require("webpack");

class WatchDeployPlugin {
    options;
    changFile;

    constructor(options = {}) {
        this.options = options;
        this.changFile = "";
    }

    sendCmd(cmd, path) {
        console.error("执行命令：", cmd);
        path = encodeURI(path)
        const req = http.get("http://127.0.0.1:9317/exec?cmd=" + cmd + "&path=" + path, (res) => {
            res.setEncoding('utf8');
            res.on('data', (data) => {
                console.error(data);
            }).on("error", () => {
                console.error("返回数据错误");
            });
        });
        req.on('error', function (err) {
            console.error("Watch模式，自动" + cmd + "失败,可能是Autox.js服务未启动");
            console.error("请使用 Ctrl+Shift+P 快捷键，启动Autox.js服务");
        });
    }

    apply(compiler) {
        if (this.options.type != null && this.options.type !== "none") {
            compiler.hooks.watchRun.tap("WatchDeployPlugin", (compiler) => {
                const modifiedFiles = compiler.modifiedFiles;
                if (modifiedFiles) {
                    for (const f of modifiedFiles) {
                        const stats = fs.statSync(f);
                        if (stats.isFile()) {
                            console.error("重新编译，改变的文件：", f);
                            this.changFile = f.replace(/\\/g, '/');
                        }
                        // if(path.posix)
                    }
                }
                // const changedTimes = compiler.watchFileSystem.watcher.mtimes;
            });
            compiler.hooks.done.tap("WatchDeployPlugin", (stats) => {
                const compilation = stats.compilation;
                if (this.changFile && this.changFile !== "") {
                    compilation.chunks.forEach(chunk => {
                        const modules = chunk.getModules();
                        modules.forEach(module => {
                            //   console.error("r---c", module.userRequest,this.changFile);
                            if (module.userRequest) {
                                let userRequest = module.userRequest.replace(/\\/g, '/');
                                if (userRequest === this.changFile) {
                                    //  console.error("chunk", chunk.files);
                                    chunk.files.forEach(file => {
                                        const projectName = path.posix.normalize(file).split(path.posix.sep)[1];
                                        const outProjectsPath = path.posix.join(compiler.outputPath, projectName).replace(/\\/g, '/');
                                        const outFilePath = path.posix.join(outProjectsPath, this.options.projects[projectName]).replace(/\\/g, '/');
                                        //  console.error("projectName", projectName,outProjecPath);
                                        //  console.error("outFilePath", outFilePath);
                                        switch (this.options.type) {
                                            case "deploy":
                                                this.sendCmd("save", "/" + outProjectsPath);
                                                break;
                                            case "rerun":
                                                this.sendCmd("rerun", "/" + outFilePath);
                                                break;
                                            default:
                                                console.error("重新编译后,不进行任何操作");
                                                break;
                                        }
                                    })
                                }
                            }
                        })
                    })
                }
            })
        }
    }
}

// module.exports.WatchDeployPluginOptions = WatchDeployPluginOptions;
module.exports = WatchDeployPlugin;
