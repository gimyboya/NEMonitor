<template>
  <div id="canvas" ></div>
</template>

<script>
import axios from 'axios' // Promise based HTTP client for the browser and node.js
import _ from 'lodash'; // A modern JavaScript utility library delivering modularity, performance & extras.

export default {
  data () {
    return {
      graph: null,
    }
  },
  mounted: function() {
    // capture the scope of this
    const _this = this; 
    // initialize a graph
    this.graph = Viva.Graph.graph(); 
    // ---- DFS Algorithm to query all the network ---
    //create an empty stack
    let activeNodeStack = []; 
    async function DFSGraph(){
      // query the first nood (root)
      let root = await axios.get(`http://go.nem.ninja:7890/node/info`);
      // push the root node
      activeNodeStack.push(root.data);
      // marking the node by adding it to the graph
      _this.graph.addNode(root.data.endpoint.host, root.data);
      // while the stack is not empty
      let n = 1;
      while (!_.isEmpty(activeNodeStack)) {
        // take one node from the top of the stack to visit next
        let nodeV = activeNodeStack.pop(); 
        //catch the error here to not disturb the flow of the scan
        try {
          // request all it's neighborhood
          // and store all the neighbour noods
          var Neighbours = await axios.get(`${nodeV.endpoint.protocol}://${nodeV.endpoint.host}:${nodeV.endpoint.port}/node/peer-list/active`);
        } catch (e) {
          if (!e.response) {
            // network error
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
            console.log(n, 'Nodes');
            n+=1;
            // create a link to the parent node
            _this.graph.addLink(nodeV.endpoint.host, nodeW.endpoint.host);
          }
        }
      }
      return _this.graph;
    };

    let layout = Viva.Graph.Layout.forceDirected(_this.graph, {
      springLength: 30,
      springCoeff: 0.0008,
      dragCoeff: 0.01,
      gravity: -1.2,
      theta: 1
    });
    let graphics = Viva.Graph.View.webglGraphics();
    let renderer = Viva.Graph.View.renderer(_this.graph,
      {
        layout: layout,
        graphics: graphics,
        renderLinks: true,
        prerender: true
      });
    renderer.run();

    DFSGraph()
      .catch(e =>{
        if (!e.response) {
          // network error
        } else {
          console.log(e.response);
          // http status code
          const code = e.response.status
          console.log('code:', code);
          // response data
          const response = e.response.data
          console.log('data:', response);
        }
      });
    
      
  },
}
</script>
<style>
body {
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
}

canvas {
  width: 100%;
  height: 100%;
}

</style>

