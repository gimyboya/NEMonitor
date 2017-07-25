<template>

  <v-app standalone>
    <v-navigation-drawer persistent light :mini-variant.sync="mini" v-model="drawer" overflow>
      <v-toolbar flat class="transparent">
        <v-list class="pa-0">
          <v-list-tile v-if="mini" @click.native.stop="mini = !mini">
          <v-list-tile-action>
            <v-icon light>chevron_right</v-icon>
          </v-list-tile-action>
        </v-list-tile>
        <v-list-tile avatar tag="div">
          <v-list-tile-content>
            <v-list-tile-title>NIS status</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action>
            <v-btn icon @click.native.stop="mini = !mini">
              <v-icon>chevron_left</v-icon>
            </v-btn>
          </v-list-tile-action>
        </v-list-tile>
        </v-list>
      </v-toolbar>
      <v-list class="pt-0" dense>
        <v-divider></v-divider>
        <v-list-group>
            <v-list-tile>
              <v-list-tile-action>
                <v-icon mdi v-badge="networkErrorNodes.length" class="red--after">lan-disconnect</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>Connection Error</v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <v-icon>keyboard_arrow_down</v-icon>
              </v-list-tile-action>
            </v-list-tile>
            <v-list-tile v-for="node in networkErrorNodes" v-bind:key="node.identity.host">
              <v-list-tile-content>
                <v-list-tile-title>{{ node.identity.host }}</v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <v-icon mdi>autorenew</v-icon>
              </v-list-tile-action>
            </v-list-tile>
          </v-list-group>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar fixed class="indigo darken-4" dark>
      <v-toolbar-side-icon @click.native.stop="drawer = !drawer"></v-toolbar-side-icon>
      <v-toolbar-title>NEMonitor</v-toolbar-title>
    </v-toolbar>
    <main>
      <v-container fluid>
        <v-layout row justify-center align-center>
          <v-flex xs12 >
            <v-card id="canvas" flat>
              <v-toolbar class="white" floating dense style="position:absolute;">
                  <v-text-field prepend-icon="search" hide-details single-line></v-text-field>
              </v-toolbar>
            </v-card>
          </v-flex>
        </v-layout>
        <v-btn
          class="red scan-btn"
          dark
          absolute
          bottom
          right
          fab
          @click.native.stop="onScan" >
          <v-icon mdi>access-point-network</v-icon>
        </v-btn>
        
      </v-container>
    </main>
  </v-app>
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
      drawer: true,
      items: [
        {
          action: 'lan-disconnect',
          title: 'Connection Error',
          items: [
            { title: 'List Item' }
          ]
        },
        {
          action: 'lan-connect',
          title: 'Connected Nodes',
          items: [
            { title: 'Breakfast & brunch' },
            { title: 'New American' },
            { title: 'Sushi' }
          ]
        },
      ],
      mini: true,
      right: null
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
body {
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
  background-color: #051525;
}

canvas {
  width: 100vw;
  height: 100vh !important;
}
#canvas {
  width: 100vw;
  height: 100vh !important;
}

.count {
  color: #E7E2DF;
}

.scan-btn{
   top: 90%;
}

.toolbar--fixed+main {
  padding-top: 40px;
}

.container{
  padding: 0;
}


</style>

