<script setup>
import {computed, reactive, ref, watch} from 'vue';
import TagsEditor from "./TagsEditor.vue";
import TagsQuality from "./TagsQuality.vue";
import KeyboardNavigation from "./KeyboardNavigation.vue";
import TrainingRunner from "./TrainingRunner.vue";
import { SmileTwoTone, FileTextOutlined } from '@ant-design/icons-vue';
import Dataset from '@/models/dataset';

const dataset = reactive({
    name: '',
    images: [],
    trainingTags: {},
    imageTags: [],
    extraPrompts: []
});

const editProgress = reactive({
    current: -1,
    currentImageDataURI: ""
});

const imageNavPrev = () => {
    if(editProgress.current === 0 || editProgress.current === -1)
        return;

    editProgress.current--;
};

const imageNavNext = () => {

    if(editProgress.current === dataset.images.length - 1 || editProgress.current === -1)
        return;

    editProgress.current++;
};

watch(() => editProgress.current, async (current, oldCurrent) => {

    if (current === -1 || current === oldCurrent)
        return

    const entry = dataset.images[current];
    const file = await entry.getFile();

    const reader = new FileReader();
    reader.addEventListener(
        "load",
        () => {
            // convert image file to base64 string
            editProgress.currentImageDataURI = reader.result;
        },
        false
    );

    reader.readAsDataURL(file);
    const [loadedTags, extraText] = await Dataset.loadImageTagsFromCtFile(dataset.images[current].name, datasetDirHandle);
    dataset.imageTags[current] = loadedTags;
    dataset.extraPrompts[current] = extraText;
});

let datasetDirHandle = null;

const selectDataset = async () => {
    datasetDirHandle = await window.showDirectoryPicker({mode: "readwrite"});

    dataset.name = datasetDirHandle.name;

    for await (const entry of datasetDirHandle.values()) {
        if (/(\.png|\.jpg|\.jpeg|\.bmp|\.webp)$/.test(entry.name.toLowerCase())) {
            dataset.images.push(entry);
        }
    }

    dataset.trainingTags = await Dataset.loadTrainingTagsFromFile(datasetDirHandle);
    await Dataset.loadAllImageTagsFromCtFile(dataset, datasetDirHandle);

    editProgress.current = 0

    if(numOfTrainingTags.value === 0) {
        // First time usage
        manageTrainingTags();
    }
};

const numOfTrainingTags = computed(() => {
    return Dataset.numOfTrainingTags(dataset.trainingTags);
});

const saveEditedTags = async () => {
    await Dataset.saveImageTagsToCtFile(
        dataset.images[editProgress.current].name,
        dataset.imageTags[editProgress.current],
        dataset.extraPrompts[editProgress.current],
        datasetDirHandle
    )
};

const manageTagsVisible = ref(false);
const manageTrainingTags = () => {
    manageTagsVisible.value = true;
};

const closeTrainingTagsModal = () => {
    manageTagsVisible.value = false;
};

const extraPromptActive = ref(false);
const hideExtraPrompt = () => {
    extraPromptActive.value = false;
};
const showExtraPrompt = (e) => {
    extraPromptActive.value = true;
};
</script>

<template>
    <a-result title="Click the button below to load your local folder with images" v-if="dataset.name === ''">
    <template #icon>
      <smile-two-tone />
    </template>
  </a-result>
    <div class="image-editor" v-else>
        <div class="image-view">
            <img :src="editProgress.currentImageDataURI" />
        </div>
        <div class="tags-editor">
            <tags-editor v-if="dataset.imageTags[editProgress.current]" :tags="dataset.imageTags[editProgress.current]" :candidates="dataset.trainingTags" edit-type="selection" @tags-changed="saveEditedTags"></tags-editor>
        </div>
        <div :class="{'extra-prompts':true, 'active': extraPromptActive}" @click="showExtraPrompt">
            <div class="close" @click.stop="hideExtraPrompt" v-if="extraPromptActive">✕</div>
            <a-textarea @change="saveEditedTags" @keydown.stop v-model:value="dataset.extraPrompts[editProgress.current]" placeholder="Extra text prompt" v-if="extraPromptActive" ></a-textarea>
            <file-text-outlined v-if="!extraPromptActive"></file-text-outlined>
        </div>
    </div>
    <div class="bottom-bar">
        <div class="load-dataset" v-if="dataset.name === ''">
            <a-button type="primary" size="large" @click="selectDataset">Load Dataset</a-button>
        </div>
        <div class="dataset-details" v-if="dataset.name !== ''">
            <div class="overview">
                <div class="name">Dataset: {{ dataset.name }}</div>
                <div class="image-num">{{ dataset.images.length }} images</div>
                <div class="quality">
                    <tags-quality :image-tags="dataset.imageTags" :candidates="dataset.trainingTags"></tags-quality>
                </div>
            </div>
            <div class="image-navigation">
                <a-button class="training-tags" @click="manageTrainingTags">Manage Tags</a-button>
                <a-button type="primary" @click="imageNavPrev" :disabled="editProgress.current === 0">[←] Previous</a-button>
                <span
                    class="edit-progress">{{ editProgress.current + 1 }}&nbsp;/&nbsp;{{ dataset.images.length }}</span>
                <a-button type="primary" @click="imageNavNext"  :disabled="editProgress.current === dataset.images.length - 1">Next [→]</a-button>
                <keyboard-navigation @left="imageNavPrev" @right="imageNavNext"></keyboard-navigation>
            </div>
            <div class="start-training">
                <training-runner :dataset="dataset" :dataset-dir-handle="datasetDirHandle"></training-runner>
            </div>
        </div>
    </div>

    <a-modal
        :visible="manageTagsVisible"
        title="Manage Training Tags"
        :footer="null"
        @ok="closeTrainingTagsModal"
        @cancel="closeTrainingTagsModal"
        width="800px"
        :mask-closable="false"
    >
        <a-alert class="training-tags-tips" message="Add detailed tags about the character" type="success" v-if="numOfTrainingTags === 0">
        <template #description>
          <p>
            The unique features of the character, such as a red ribbon on the head, should be added as the training tags. To make the image generation consistent, ALL the unique features of the character should be tagged and images WITH AND WITHOUT this feature should be added.
          </p>
        </template>
    </a-alert>
      <tags-editor :tags="dataset.trainingTags" edit-type="management" @tags-changed="Dataset.saveTrainingTagsToFile(dataset, datasetDirHandle)"></tags-editor>
    </a-modal>
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

    .image-view
        position absolute
        width 60%
        left 0
        top 16px
        bottom 6px
        overflow hidden

        img
            display block
            max-width 100%
            max-height 100%
            width auto
            height auto
            margin 0 auto

    .tags-editor
        position absolute
        width 38%
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

.load-dataset
    text-align center
    line-height 90px

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

    .image-navigation
        position absolute
        width 440px
        left 50%
        margin-left -220px
        top 32px

        .training-tags
            margin-right 36px

        .edit-progress
            margin: 0 24px

    .start-training
        position absolute
        right 16px
        top 30px

.training-tags-tips
    margin-bottom 12px

.extra-prompts
    position absolute
    width 32px
    height 32px
    left 0
    bottom 16px
    border 1px solid #cccccc
    border-radius 4px
    background-color white
    font-size 16px
    color #999999
    cursor pointer
    text-align center
    line-height 32px

    &:hover
        border-color #1890ff
        color #1890ff

    &.active
        width 380px
        height 140px
        border-color #1890ff
        cursor default

    .close
        position absolute
        width 20px
        height 20px
        right 0
        top 0
        cursor pointer
        text-align center
        line-height 20px
        z-index 10
        font-size 12px
        color #cccccc
        &:hover
            color #333333

    textarea
        position absolute
        display block
        left 6px
        right 6px
        top 16px
        bottom 6px
        border 0
        resize none
        z-index 5
        width auto
        height auto
        &:focus
            outline none
            box-shadow none
</style>
