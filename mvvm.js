/**实现简单的MVVM框架（双向绑定、模板） */


let id = 0;

// 1.首先实现数据劫持，侦测变化
function observe(data) {
    if (!data || typeof data !== 'object') return
    for (let k in data) {
        let value = data[k]
        let dep = new Dep()
        Object.defineProperty(data, k, {
            enumerable: true,
            configurable:true,

            get: function() { // 收集依赖
                if (window.target) {
                    window.target.subscribeTo(dep)
                }
                return value
            },
            
            set: function(newVal) {
                value = newVal
                dep.notify() // 触发依赖
            }
        })
        if (typeof value === 'object') {
            observe(value)
        }
    }
}

// 2.依赖收集，触发通知
class Dep {
    constructor() {
        this.id = id ++
        this.deps = []
    }
    depend(watcher) { // 添加订阅者
        this.deps.push(watcher)
    }
    remove(watcher) {
        let idx = this.deps.indexOf(watcher)
        if (idx > -1) {
            this.deps.splice(idx, 1)
        }
    }
    notify() { // 通知所有订阅者更新
        this.deps.forEach(watcher => watcher.update())
    }
}

// 订阅者类
class Watcher {
    constructor(vm, key, cb) {
        this.vm = vm
        this.deps = {}
        this.key = key
        this.cb = cb
        this.value = this.getValue()
    }
    getValue() {
        window.target = this // getter中会将window.target加入变量对应的队列
        let value = this.vm.$data[this.key] // 访问变量，触发getter 把自己加入到deps队列中
        window.target = null
        return value
    }

    update() {
        let oldValue = this.value
        let newValue = this.getValue()
        if (oldValue !== newValue) {
            this.value = newValue
            this.cb.call(this.vm, newValue, oldValue)
        }
    }
    subscribeTo(dep) {
        if (!this.deps[dep.id]) {
            dep.depend(this)
            this.deps[dep.id] = dep
        }
    }
}

class MVVM {
    constructor(opts) {
        this.init(opts)
        new Compile(this)
    }
    init(opts) {
        this.$el = document.querySelector(opts.el)
        this.$data = opts.data || {}
        observe(this.$data) // 劫持data中的数据
    }
}

class Compile {
    constructor(vm) {
      this.vm = vm;
      this.node = vm.$el;
      this.compile();
    }
  
    compile() {
      this.traverse(this.node);
    }
  
    traverse(node) {
      if (node.nodeType === 1) { // 元素节点
        this.compileNode(node);
        node.childNodes.forEach((childNode) => {
          this.traverse(childNode);
        });
      } else if (node.nodeType === 3) { // 文本节点
        this.renderText(node);
      }
    }
  
    // 处理指令
    compileNode(node) {
      let attrsArr = Array.from(node.attributes);
      attrsArr.forEach((attr) => {
        if (attr.name === 'self-model') {
          this.bindModel(node, attr);
        } else if (this.isHandle(attr.name)) {
          this.bindHandle(node, attr);
        }
      });
    }
  
    bindModel(node, attr) {
      let key = attr.value;
      node.value = this.vm.$data[key];
      new Watcher(this.vm, key, function (newVal) {
        node.value = newVal; // 回调函数更新视图
      });// 创建watcher实例，当值变化时，通知该实例，触发回调
      node.oninput = (e) => { // 这样，当用户输入时，observer会收到节点变化的通知
        this.vm.$data[key] = e.target.value; // 触发setter
      };
    }
  
    bindHandle(node, attr) {
      let startIndex = attr.name.indexOf(":") + 1;
      let endIndex = attr.name.length;
      let eventType = attr.name.substring(startIndex, attr.name.length);
      let method = attr.value;
      node.addEventListener(eventType, this.vm.methods[method]);
    }

  
    isHandle(attrName) {
      return attrName.indexOf("v-on") > -1;
    }
  
    // 渲染单变量
    renderText(node) {
      console.log("render fun in class Compile");
      let reg = /{{(.+?)}}/g;
      let match;
      while ((match = reg.exec(node.nodeValue))) {
        let raw = match[0];
        let key = match[1].trim();
        node.nodeValue = node.nodeValue.replace(raw, this.vm.$data[key]);
        new Watcher(this.vm, key, function (newVal, oldVal) {
          node.nodeValue = node.nodeValue.replace(oldVal, newVal);
        });
      }
    }
  }