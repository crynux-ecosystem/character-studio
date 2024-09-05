import { defineStore } from 'pinia'

export const useNodeStore = defineStore('node', {
    state: () => ({
        node_host: '',
        node_port: '',
        node_info: {
            node_name: '',
            node_type: '',
            node_capabilities: '',
            node_version: ''
        }
    }),

    getters: {
        nodeUrl() {
            return this.node_host + ":" + this.node_port
        },

        isNodeTested() {
            return this.node_info.node_name !== "";
        },

        isNodeFilled() {
            return this.node_host !== "" && this.node_port !== "";
        }
    },

    actions: {
        clearNodeInfo() {
            this.node_info.node_name = '';
            this.node_info.node_type = '';
            this.node_info.node_capabilities = '';
            this.node_info.node_version = '';
        }
    }
});
