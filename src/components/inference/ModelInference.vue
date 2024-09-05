<script setup>
import TagsEditor from '../training/TagsEditor.vue'
import {computed, reactive, ref} from 'vue'
import { SmileTwoTone } from '@ant-design/icons-vue'
import config from '../../config.json'
import Dataset from "@/models/dataset";
import inferenceAPI from "@/api/v1/inference";
import {useTaskStore} from "@/stores/task";
import InferenceRunner from "@/components/inference/InferenceRunner.vue";
import {useNodeStore} from "@/stores/node";
import {useClientStore} from "@/stores/client";

const taskStore = useTaskStore();
const clientStore = useClientStore();

const referencePoses = config.reference_poses;
const generatedImages = ref([]);
const selectedTags = reactive(JSON.parse(JSON.stringify(config.tag_structure)));
const nodeStore = useNodeStore();

let datasetDirHandle = null

const dataset = reactive({
    name: '',
    trainingTags: {}
});

const selectModel = async () => {
    datasetDirHandle = await window.showDirectoryPicker({ mode: 'read' })
    dataset.name = 'Not found';
    dataset.trainingTags = await Dataset.loadTrainingTagsFromFile(datasetDirHandle);
    taskStore.inference_task.model_id = "";

    // Find the model file

    let modelFileEntry;

    for await (const entry of datasetDirHandle.values()) {
        if (/\.safetensors$/.test(entry.name.toLowerCase())) {
            modelFileEntry = entry;
            break;
        }
    }

    if(modelFileEntry) {
        dataset.name = datasetDirHandle.name;

        if(nodeStore.isNodeFilled) {
            // See if we have the cache of this model on the node
            const modelId = modelFileEntry.name.replace(/\.safetensors$/, '');

            try {
                await inferenceAPI.getModel(modelId)

                // Model cached on the server
                taskStore.inference_task.model_id = modelId;

            } catch {
                // Model not cached by the node
                // Should be uploaded to the node now
                const modelFile = await modelFileEntry.getFile();
                const res = await inferenceAPI.uploadModel(modelFile, clientStore.client_id);
                if(res.model_id) {
                    taskStore.inference_task.model_id = res.model_id;
                }
            }
        }
    }
};

const referencePosesActiveKey = ref(['sitting']);
const selectedPose = reactive({category:'', index:''});
const selectPose = (category, index) => {

    if(selectedPose.category === category && selectedPose.index === index) {
        selectedPose.category = '';
        selectedPose.index = '';
    } else {
        selectedPose.category = category;
        selectedPose.index = index;
    }
};

const numOfTags = computed(() => {
    let total = 0;
    Object.keys(dataset.trainingTags).forEach((category) => {
        total += dataset.trainingTags[category].length;
    });
    return total;
});

const modelCacheStatus = computed(() => {
    if(taskStore.inference_task.model_id) {
        return "cached";
    } else {
        return "not cached";
    }
});

const extraPrompts = ref('');

const clearImage = () => {
    generatedImages.value.length = 0;
};
const updateImage = (imageNum, imageDataURL) => {
    generatedImages.value.push(imageDataURL);
};

const imagePreviewVisible = ref(false);
</script>

<template>
    <a-result title="Click the button below to load your local folder with model" v-if="dataset.name === ''">
    <template #icon>
      <smile-two-tone />
    </template>
  </a-result>
  <div class="image-editor" v-else>
    <div class="pose-selection">
        <a-collapse v-model:activeKey="referencePosesActiveKey">
            <a-collapse-panel
                :key="poseCategory"
                :header="poseCategory"
                 v-for="poseCategory in Object.keys(referencePoses)"
            >
                <div class="pose-image" v-for="i in referencePoses[poseCategory]" :class="{'selected': selectedPose.category === poseCategory && selectedPose.index === i}" @click="selectPose(poseCategory, i)">
                    <img :src="'./poses/' + poseCategory + '/' + poseCategory + '_' + String(i).padStart(2, '0') + '.png'" />
                </div>

            </a-collapse-panel>
        </a-collapse>
    </div>
    <div class="image-view">
        <a-image-preview-group>
        <div class="image-wrapper" v-for="num in taskStore.inference_task.config.num_images">
            <a-image
                :preview="{ imagePreviewVisible: false }"
                :src="generatedImages[num-1]"
                @click="imagePreviewVisible = true"
                v-if="generatedImages[num - 1]"
            />
            <img v-else alt="image placeholder" src="data:image/png;base64,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" />
        </div>
        </a-image-preview-group>
    </div>
    <div class="tags-editor">
      <tags-editor
        :tags="selectedTags"
        :candidates="dataset.trainingTags"
        edit-type="selection"
      ></tags-editor>
    </div>
  </div>
  <div class="bottom-bar">
    <div class="load-dataset" v-if="dataset.name === ''">
      <a-button type="primary" size="large" @click="selectModel">Load Model</a-button>
    </div>
    <div class="dataset-details" v-else>
        <div class="overview">
                <div class="name">Model: {{ dataset.name }}</div>
                <div class="tags-number">No. tags: {{ numOfTags }}</div>
                <div class="model-cache">Model cache: {{ modelCacheStatus }}</div>
            </div>
        <div class="extra-prompts">
            <a-textarea v-model:value="extraPrompts" placeholder="Extra prompts" :rows="2" />
        </div>
      <div class="start-generating">
        <inference-runner :tags="selectedTags" :pose="selectedPose" :extra-prompts="extraPrompts" @image="updateImage" @task-started="clearImage"></inference-runner>
      </div>
    </div>
  </div>
</template>

<style scoped lang="stylus">
.ant-result
    position absolute
    width 100%
    height 300px
    top 50%
    margin-top -150px
.image-editor
    position absolute
    left 16px
    right 0
    top 0
    bottom 100px
    z-index 10

    .pose-selection
        position absolute
        width 200px
        left 0
        top 16px
        bottom 6px
        overflow-y auto

        .pose-image
            width 100%
            padding 16px
            margin-bottom 16px
            border 1px solid white
            cursor pointer

            &.selected,&.selected:hover
                border 1px solid #333333

            img
                display block
                width 100%

            &:hover
                border 1px solid #999999

    .image-view
        position relative
        margin-left 200px
        margin-right 306px

        padding-top 16px
        height 100%
        overflow-y auto

        .image-wrapper
            position relative
            width 33%
            float left
            padding 16px

    .tags-editor
        position absolute
        width 300px
        right 6px
        top 0
        bottom 0
        overflow-y auto

.bottom-bar
    position absolute
    left 0
    right 0
    bottom 0
    height 100px
    border-top 1px solid #f0f0f0
    z-index 20

    .dataset-details
        padding 6px

        .overview
            width 200px
            padding 8px 16px

            .name
                font-weight 600
                white-space nowrap
                text-overflow ellipsis
                overflow hidden

        .extra-prompts
            position absolute
            width 30%
            left 50%
            margin-left -15%
            top 26px

            textarea
                resize none
                outline none

        .start-generating
            position absolute
            right 16px
            top 30px

.load-dataset
    text-align center
    line-height 90px


</style>
