<template>
  <div class="wrapper">
    <header>
      <el-select 
        v-model="nodeUrl" 
        placeholder="Select or enter a node"
        filterable
        allow-create
        >
      <el-option-group
        v-for="group in nodes"
        :key="group.label"
        :label="group.label">
        <el-option
          v-for="item in group.options"
          :key="item.value"
          :label="item.label"
          :value="item.value">
        </el-option>
      </el-option-group>
    </el-select>
    </header>
    <!-- header-end -->

    <aside>
      <h2>Node status</h2>
      <el-menu
      default-active="1"
      class="el-menu-vertical-demo"
      background-color="#545c64"
      text-color="#fff"
      active-text-color="#ffd04b">
        <el-menu-item index="1">
          <i class="el-icon-menu"></i>
          <span>Navigator one</span>
        </el-menu-item>
        <el-menu-item index="2">
          <i class="el-icon-setting"></i>
          <span>Navigator Tow</span>
        </el-menu-item>
      </el-menu>
    </aside>
    <!-- sidebar-end -->

    <div class="main">
      <div id="canvas"></div>
    </div>
    <!-- main-end -->

    <footer>Footer</footer>
    <!-- footer-end -->

  </div>
</template>

<script>
import axios from 'axios' // Promise based HTTP client for the browser and node.js
import _ from 'lodash'; // A modern JavaScript utility library delivering modularity, performance & extras.

export default {
  data () {
    return {
      graph: null,
      axios: null,
      renderer: null,
      scanTimeout: 5000,
      networkErrorNodes: [],
      count: 0,
      nodes: [{
          label: 'Mainnet Nodes',
          options: [{
            value: 'Shanghai',
            label: 'Shanghai'
          }, {
            value: 'Beijing',
            label: 'Beijing'
          }]
        }, {
          label: 'Testnet Nodes',
          options: [{
            value: 'Chengdu',
            label: 'Chengdu'
          }, {
            value: 'Shenzhen',
            label: 'Shenzhen'
          }, {
            value: 'Guangzhou',
            label: 'Guangzhou'
          }, {
            value: 'Dalian',
            label: 'Dalian'
          }]
        }],
        nodeUrl: ''
    };
  },
  computed: {
    errCount: function(){
      return this.networkErrorNodes.length;
    }
  },
  methods: {
    onTimeoutChange(value){
      axios.defaults.timeout = this.scanTimeout;
    },
    async onScan(e){
      console.log('I started!');
      // capture the scope of this
      const _this = this;
      // ---- DFS Algorithm to query all the network ---
      //create an empty stack
      let activeNodeStack = [];
      // query the first nood (root)
      let root = await _this.axios.get(`http://go.nem.ninja:7890/node/info`);
      // push the root node
      activeNodeStack.push(root.data);
      // marking the node by adding it to the graph
      _this.graph.addNode(root.data.endpoint.host, root.data);
      // while the stack is not empty
      while (!_.isEmpty(activeNodeStack)) {
        // take one node from the top of the stack to visit next
        let nodeV = activeNodeStack.pop();
        //catch the error here to not disturb the flow of the scan
        try {
          // request all it's neighborhood
          // and store all the neighbour noods
          let Neighbours = await _this.axios.get(`${nodeV.endpoint.protocol}://${nodeV.endpoint.host}:${nodeV.endpoint.port}/node/peer-list/reachable`);
          // for each one of them
          for (let nodeW of Neighbours.data.data) {
            //check if they already exist in the graph
            let node = _this.graph.getNode(nodeW.endpoint.host);
            // if they don't
            if (!node) {
              // add the node to the stack
              activeNodeStack.push(nodeW);
              // mark it by adding it to the graph
              _this.graph.addNode(nodeW.endpoint.host, nodeW);
              _this.count = _this.graph.getNodesCount();
              // create a link to the parent node
              _this.graph.addLink(nodeV.endpoint.host, nodeW.endpoint.host);
            }
          }
        
        } catch (e) {
          if (!e.response) {
            // network error
            _this.networkErrorNodes.push(nodeV);
          } else {
            console.log(e.response);
            // http status code
            const code = e.response.status
            console.log('code:', code);
            // response data
            const response = e.response.data
            console.log('data:', response);
          }
        }
        
      }
      return _this.graph;
    }
  },
  mounted: function() {
    const _this = this;
    // initialize a graph
    this.graph = Viva.Graph.graph();
    // create a new axios instance
    this.axios = axios.create({
      timeout: 5000,
    });
    let offlayout = Viva.Graph.Layout.offline(this.graph, {
      terations: 100, // Run `100` iterations only
      saveEach: 10, // Save each `10th` iteration
      outDir: './cache', // Save results into `./cache`
      layout: require('ngraph.forcelayout3d') // use custom layouter
    });
   let layout = Viva.Graph.Layout.forceDirected(this.graph, {
      springLength: 30,
      springCoeff: 0.0008,
      dragCoeff: 0.01,
      gravity: -1.2,
      theta: 1
    });
   let layout3d = Viva.Graph.Layout.forceDirected3d(this.graph, {
      springLength: 30,
      springCoeff: 0.0008,
      dragCoeff: 0.01,
      gravity: -1.2,
      theta: 1
    });
    let graphics = Viva.Graph.View.webglGraphics();
    this.renderer = Viva.Graph.View.renderer(this.graph,
      {
        container: document.getElementById('canvas'),
        layout: layout,
        graphics: graphics,
        renderLinks: true,
        prerender: true
      });
    this.renderer.run();
  },
}
</script>
<style>
body, html {
  margin: 0;
  height: 100%;
  font-family: 'Open Sans', sans-serif;
}
header, footer {
  background-color: #B3C0D1;
  color: #333;
  text-align: center;
}

header {
  grid-area: header;
  display: flex;
  justify-content: center;
  align-items: center;
}

footer {
  grid-area: footer;
}

aside {
  background-color: #545c64;
  color: #fff;
  text-align: center;
  grid-area: sidebar;
}

.main {
  background-color: #E9EEF3;
  color: #333;
  text-align: center;
  grid-area: content;
}

.wrapper {
  display: grid;
  grid-template-columns: 200px auto auto;
  grid-template-rows: 50px auto 50px;
  grid-template-areas: "sidebar  header header"
                        "sidebar content content"
                        "sidebar footer footer";
  height: 100%;
}

canvas {
  width: 100vw;
  height: 100vh !important;
}
#canvas {
  width: 100vw;
  height: 100vh !important;
}


</style>

