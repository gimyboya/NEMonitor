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
    // query the first nood (root)
    async function DFSGraph(){
      let n = 1;
      let root = await axios.get(`http://23.228.67.85:7890/node/info`);
      // push the root node
      activeNodeStack.push(root.data);
      // marking the node by adding it to the graph
      _this.graph.addNode(root.data.endpoint.host, root.data);
      // while the stack is not empty
      while (!_.isEmpty(activeNodeStack)) {
        // take one node from the top of the stack
        let nodeV = _.head(activeNodeStack);
        
        // pop it
        activeNodeStack.pop();
        
        // request all it's neighborhood
        // and store all the neighbour noods
        let Neighbours = await axios.get(`${nodeV.endpoint.protocol}://${nodeV.endpoint.host}:${nodeV.endpoint.port}/node/peer-list/reachable`);
        // for each one of them
        for (let nodeW of Neighbours.data.data) {
          //check if they already exist in the graph
          console.log(nodeW.endpoint.host);
          let node = _this.graph.getNode(nodeW.endpoint.host);
          console.log(node);
          // if they don't
          if (!node) {
            // add the node to the stack
            activeNodeStack.push(nodeW);
            // mark it by adding it to the graph
            _this.graph.addNode(nodeW.endpoint.host, nodeW);
            console.log(n, 'Nodes');
            n += 1;
            // create a link to the parent node
            console.log('v:', nodeV);
            _this.graph.addLink(nodeV, nodeW);
          }
        }
      }
      return _this.graph;
    };

    DFSGraph()
      .then(response =>{
        var renderer = Viva.Graph.View.renderer(response, {
          container: document.getElementById('canvas')
        });
        renderer.run();
      })
      .catch(e =>{
        console.error(e);
      });
    
      
  },
}
</script>
<style>
#canvas{
  width: 100%;
  margin: 0 auto;
}
</style>

