let http = require('http')
let fs = require('fs')
let path = require('path')
let express = require('express')
var bodyParser = require('body-parser')
let jszip = require('jszip')
let formidable = require('formidable')
let util = require('util')

let app = express()
let jsonParse = bodyParser.json()

app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-headers', 'X-Requested-With, Content-Type')
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
    if(req.method == 'OPTIONS') {
        res.end('ok')
    } else {
        next()
    }
})
// 检测查询条件是否为空,并过滤掉
/**
 * 
 * @param {Buffer} buffer 数据源
 * @param {Object} query 查询条件
 * @return {Array} data 查询结果
 */
function getQueryResult(buffer,query) {
    let queryList = []
    Object.keys(query).forEach(key => {
        if(query[key] === '' || query[key] === undefined || query[key] === null) {
            // 
        } else {
            let o = {}
            o[key] = query[key]
            queryList.push(o)
        }
    })
    let data = buffer.toString() || '[]'
    data = JSON.parse(data).filter(item => {
        return queryList.every(obj => {
            let key = Object.keys(obj)[0]
            if(item[key].includes(obj[key])){ // 模糊查询
                return true
            } else {
                return false
            }
        })
    })
    return data
}

/**
 * 添加数据
 * @param {Buffer}
 * @return {Array}
 */
function addData(buffer, obj) {
    let data = buffer.toString() || '[]'
    data = JSON.parse(data)
    data.push(obj)
    return data
}

// 更新项目进度
function updateProjectProgress(projectId) {
    let moduleList = JSON.parse(fs.readFileSync(path.join(__dirname, 'store/module.json')).toString())
    let projectList = JSON.parse(fs.readFileSync(path.join(__dirname, 'store/project.json')).toString())
    projectList.map((project, index) => {
        if(project.projectCode == projectId) {
            let totalProgress = 0
            let length = 0
            project.module.map(moduleId => {
                moduleList.map(m => {
                    if(moduleId == m.moduleId) {
                        console.log('m', m.progress)
                        totalProgress =  totalProgress + m.progress || 0
                        length++
                    }
                })
            })
            project.progress = totalProgress / length
            console.log(totalProgress,length)
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/project.json'),JSON.stringify(projectList))
}

// 登陆
app.post('/login', jsonParse,(req, res) => {
    let data = JSON.parse(fs.readFileSync(path.join(__dirname, 'store/user.json')).toString())
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    let user = data.filter(item => {
        return (item.account == req.body.account && item.password == req.body.password)
    })[0]
    if(user) {
        res.end(JSON.stringify({
            code: 0,
            msg: 'success',
            data: user
        }))
    } else {
        res.end(JSON.stringify({code: 1, msg: '账号或密码错误'}))
    }
})





// 工作记录---------------------------------------------------------------------------
// 查询report
app.post('/reportList', jsonParse,(req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/report.json'))
    data = getQueryResult(data, req.body)
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(data))
})

// 添加report
app.post('/addReport', jsonParse, (req, res) => {
    if(!req.body) {
        res.end(JSON.stringify({code: 1, msg: req.body}))
        return
    }
    // 修改任务进度
    let moduleList = JSON.parse(fs.readFileSync(path.join(__dirname, 'store/module.json')).toString())
    let projectCode = ''
    moduleList.map((item, index) => {
        if(item.userId == req.body.userId) {
            item.progress = req.body.progress
            moduleList.splice(index, 1, item)
            // 更新项目进度
            let projectList = JSON.parse(fs.readFileSync(path.join(__dirname, 'store/project.json')).toString())
            projectList.map(project => {
                if(project.module.includes(item.moduleId)) {
                    projectCode = project.projectCode
                }
            })
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/module.json'),JSON.stringify(moduleList))
    updateProjectProgress(projectCode)


    let buffer = fs.readFileSync(path.join(__dirname, 'store/report.json'))
    let arr = addData(buffer, req.body)
    fs.writeFileSync(path.join(__dirname, 'store/report.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success'}))
})

// 任务 -------------------------------------------------------------------------------
// 查询任务
app.post('/moduleList', jsonParse,(req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/module.json'))
    data = getQueryResult(data, req.body)
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(data))
})

// 添加任务
app.post('/addModule', jsonParse, (req, res) => {
    if(!req.body) {
        res.end(JSON.stringify({code: 1, msg: req.body}))
        return
    }
    let buffer = fs.readFileSync(path.join(__dirname, 'store/module.json'))
    let arr = addData(buffer, req.body)
    fs.writeFileSync(path.join(__dirname, 'store/module.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success'}))
})

// 编辑任务
app.post('/editModule', jsonParse, (req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/module.json'))
    let arr = JSON.parse(data.toString() || '[]')
    arr.forEach((item, index) => {
        if(item.moduleId === req.body.moduleId) {
            arr.splice(index, 1, req.body)
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/module.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success', data: arr}))
})

// 删除任务
app.post('/deleteModule', jsonParse, (req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/module.json'))
    let arr = JSON.parse(data.toString() || '[]')
    arr.forEach((item, index) => {
        if(item.moduleId === req.body.moduleId) {
            arr.splice(index, 1)
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/module.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success'}))
})

// 用户 ------------------------------------
// 获取用户详情
app.post('/userDetail', jsonParse,(req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/user.json'))
    data = getQueryResult(data, req.body)
    console.log(data)
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(data[0]))
})
// 查询用户
app.post('/userList', jsonParse,(req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/user.json'))
    data = getQueryResult(data, req.body)
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(data))
})

// 添加用户
app.post('/addUser', jsonParse, (req, res) => {
    if(!req.body) {
        res.end(JSON.stringify({code: 1, msg: req.body}))
        return
    }
    let buffer = fs.readFileSync(path.join(__dirname, 'store/user.json'))
    let arr = addData(buffer, req.body)
    fs.writeFileSync(path.join(__dirname, 'store/user.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success'}))
})

// 编辑用户
app.post('/editUser', jsonParse, (req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/user.json'))
    let arr = JSON.parse(data.toString() || '[]')
    arr.forEach((item, index) => {
        if(item.userId === req.body.userId) {
            arr.splice(index, 1, req.body)
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/user.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success', data: arr}))
})

// 删除用户
app.post('/deleteUser', jsonParse, (req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/user.json'))
    let arr = JSON.parse(data.toString() || '[]')
    arr.forEach((item, index) => {
        if(item.userId === req.body.userId) {
            arr.splice(index, 1)
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/user.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success'}))
})


// 项目--------------------------------------
// 查询项目
app.post('/projectList', jsonParse,(req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/project.json'))
    data = getQueryResult(data, req.body)
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(data))
})

// 添加项目
app.post('/addProject', jsonParse, (req, res) => {
    if(!req.body) {
        res.end(JSON.stringify({code: 1, msg: req.body}))
        return
    }
    let buffer = fs.readFileSync(path.join(__dirname, 'store/project.json'))
    let arr = addData(buffer, req.body)
    console.log(buffer, req.body)
    fs.writeFileSync(path.join(__dirname, 'store/project.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success'}))
})

// 编辑项目
app.post('/editProject', jsonParse, (req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/project.json'))
    let arr = JSON.parse(data.toString() || '[]')
    arr.forEach((item, index) => {
        if(item.projectCode === req.body.projectCode) {
            arr.splice(index, 1, req.body)
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/project.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success', data: arr}))
})

// 删除项目
app.post('/deleteProject', jsonParse, (req, res) => {
    let data = fs.readFileSync(path.join(__dirname, 'store/project.json'))
    let arr = JSON.parse(data.toString() || '[]')
    arr.forEach((item, index) => {
        if(item.projectCode === req.body.projectCode) {
            arr.splice(index, 1)
        }
    })
    fs.writeFileSync(path.join(__dirname, 'store/project.json'),JSON.stringify(arr))
    res.end(JSON.stringify({code: 0, msg: 'success'}))
})

// 下载图片
app.get('/download', (req, res) => {
    fs.readFile(path.join(__dirname, 'img/1.png'), (err, data) => {
        if(err) {
            console.log(err)
        } else {
            let zip = new jszip()
            let img = zip.folder("images")
            let dirs = fs.readdirSync(path.join(__dirname, 'img'))
            // 循环加入所有图片
            dirs.forEach(d => {
                img.file(d, fs.readFileSync(path.join(__dirname,'img/'+ d)))
            })
            zip.generateNodeStream({type:'nodebuffer',streamFiles:true}).pipe(res)
            
        }
    })
})
// 上传图片
app.post('/upload', (req, res) => {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      fs.writeFileSync(path.join(__dirname, 'img/' + files.file.name), files.file)
      fs.rename(files.file.path, path.join(__dirname, 'img/' + files.file.name), function(err) {
        if (err) throw err;
        // 删除临时文件夹文件, 
        fs.unlink(files.file.path, function() {
           if (err) throw err;
        });
      });
      res.end(JSON.stringify({code: 0, msg: 'success', data:{fileName: files.file.name, file:files}}));
    });
})

app.listen(3000, (err, data) => {
    console.log('start success; port: localhost:3000')
})