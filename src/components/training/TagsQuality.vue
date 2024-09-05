<script setup>
import {ref} from "vue";
import {CheckCircleFilled} from "@ant-design/icons-vue";

const props = defineProps(['imageTags', 'candidates'])
const qualityModalVisible = ref(false);
const showQualityModal = () => {
    updateQuality();
    qualityModalVisible.value = true;
};
const hideQualityModal = () => {
    qualityModalVisible.value = false;
};

const activeKey = ref('balance');

const balanceTableColumns = [
     {
        title: 'Tag',
        dataIndex: 'tag',
        key: 'tag',
    },
    {
        title: 'No. having',
        dataIndex: 'having',
        key: 'having',
    },
    {
        title: 'No. missing',
        dataIndex: 'missing',
        key: 'missing',
    },
    {
        title: 'Suggestion',
        dataIndex: 'suggestion',
        key: 'suggestion',
    }
];


const balanceTableData = [];

const updateQuality = () => {
    const tagImageCount = {};

    Object.keys(props.candidates).forEach((category) => {
        props.candidates[category].forEach((tag) => {
            tagImageCount[tag] = {
                having: 0,
                missing: props.imageTags.length
            }
        });
    });

    Object.keys(props.candidates).forEach((category) => {
        props.imageTags.forEach((imageTags) => {
            imageTags[category].forEach((tag) => {
                if(typeof(tagImageCount[tag]) !== 'undefined') {
                    tagImageCount[tag].having++;
                    tagImageCount[tag].missing--;
                }
            });
        });
    });

    balanceTableData.length = 0;

    Object.keys(tagImageCount).forEach((tag) => {
        const tagData = tagImageCount[tag];

        tagData.key = tag;
        tagData.tag = tag;

        // Too few images with tag
        const total = tagData.having + tagData.missing;
        if(total / props.imageTags.length < 0.3) {
            tagData.advise = "Add more images with this tag";
        } else if(Math.abs(tagData.having - tagData.missing) /  total  > 0.5) {
            if(tagData.having > tagData.missing) {
                tagData.suggestion = "Add more images without this tag";
            } else {
                tagData.suggestion = "Add more images with this tag";
            }
        }

        balanceTableData.push(tagData);
    });
};

</script>

<template>
    <a-tag color="orange" style="cursor:pointer" @click="showQualityModal">Quality: medium</a-tag>

    <a-modal
        :visible="qualityModalVisible"
        title="Dataset Quality"
        :footer="null"
        @ok="hideQualityModal"
        @cancel="hideQualityModal"
        width="900px"
        :mask-closable="false"
        :destroy-on-close="true"
    >

        <a-tabs
            v-model:activeKey="activeKey"
            tab-position="left"
        >
            <a-tab-pane key="balance" tab="Tag Balance">
                <a-table
                    :dataSource="balanceTableData"
                    :columns="balanceTableColumns"
                    :pagination="false"
                    size="small"
                >
                    <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'suggestion'">
                            <a-alert :message="record['suggestion']" type="warning" show-icon v-if="record['suggestion'] != null" />
                            <check-circle-filled v-else  style="color: dodgerblue"/>
                        </template>
                        <template v-else>
                            <span>{{ record[column.key] }}</span>
                        </template>
                    </template>
                </a-table>
            </a-tab-pane>
            <a-tab-pane key="independence" tab="Tag Independence">Independence</a-tab-pane>
            <a-tab-pane key="image-size" tab="Image Size">Image</a-tab-pane>
        </a-tabs>
    </a-modal>
</template>

<style scoped>

</style>
