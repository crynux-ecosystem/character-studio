<script setup>
import { reactive, ref, nextTick } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'

const props = defineProps(['tags', 'editType', 'candidates'])
const activeKey = ref(['name'])
const emit = defineEmits(['tagsChanged'])

const tagsNamesAndTips = {
  name: {
    name: 'Character common',
    tips: 'Unique name to identify the character, common tags to add to every image.'
  },
  size: {
      name: 'Photo size',
    tips: 'Full body, upper body or face.'
  },
  pose: {
    name: 'Pose',
    tips: 'Standing, sitting, lying, etc.'
  },
  head: {
    name: 'Head',
    tips: 'Head features, such as ribbon and hair style.'
  },
  eyes: {
    name: 'Eyes',
    tips: 'head features, such as ribbon and hair style.'
  },
  mouth: {
    name: 'Mouth',
    tips: 'head features, such as ribbon and hair style.'
  },
  body: {
    name: 'Body',
    tips: 'head features, such as ribbon and hair style.'
  },
  legs: {
    name: 'Legs',
    tips: 'head features, such as ribbon and hair style.'
  },
  shoes: {
    name: 'Shoes and feet',
    tips: 'head features, such as ribbon and hair style.'
  },
  hands_holding: {
    name: 'Hand hold objects',
    tips: 'head features, such as ribbon and hair style.'
  },
  accessories: {
    name: 'Accessories',
    tips: 'Other accessories, such as backpack and guns.'
  },
  background: {
    name: 'Background',
    tips: 'head features, such as ribbon and hair style.'
  },
  others: {
    name: 'Other tags',
    tips: 'Uncategorized tags'
  }
}

const categoryInputs = reactive({})
const categoryInputRefs = {}

Object.keys(tagsNamesAndTips).forEach((category) => {
  categoryInputRefs[category] = ref()
  categoryInputs[category] = {
    inputVisible: false,
    inputValue: ''
  }
})

const handleClose = (category, removedTag) => {
  const tagIdx = props.tags[category].indexOf(removedTag)
  if (tagIdx !== -1) {
    props.tags[category].splice(tagIdx, 1)
    emit('tagsChanged')
  }
}
const showInput = (category) => {
  categoryInputs[category].inputVisible = true
  nextTick(() => {
    categoryInputRefs[category].value.focus()
  })
}
const handleInputConfirm = (category) => {
  if (categoryInputs[category].inputValue !== '') {
    const tag = categoryInputs[category].inputValue

    if (props.tags[category].indexOf(tag) === -1) {
      props.tags[category].push(tag)
      emit('tagsChanged')
    }
  }

  categoryInputs[category].inputVisible = false
  categoryInputs[category].inputValue = ''
}

const toggleTagSelection = (category, tag) => {
  const tagIdx = props.tags[category].indexOf(tag)
  if (tagIdx === -1) {
    props.tags[category].push(tag)
  } else {
    props.tags[category].splice(tagIdx, 1)
  }
  emit('tagsChanged')
}
</script>

<template>
  <a-collapse v-model:activeKey="activeKey">
    <a-collapse-panel
      :key="category"
      :header="tagsNamesAndTips[category].name"
      v-for="category in Object.keys(tagsNamesAndTips)"
    >
      <a-typography-paragraph>
        <div class="tags-manager" v-if="editType === 'management'">
          <blockquote>{{ tagsNamesAndTips[category].tips }}</blockquote>
          <template v-for="tag in props.tags[category]" :key="tag">
            <a-tooltip v-if="tag.length > 20" :title="tag">
              <a-tag color="blue" @close="handleClose(category, tag)" :closable="true">
                {{ `${tag.slice(0, 20)}...` }}
              </a-tag>
            </a-tooltip>
            <a-tag color="blue" v-else @close="handleClose(category, tag)" :closable="true">
              {{ tag }}
            </a-tag>
          </template>
          <a-input
            v-if="categoryInputs[category].inputVisible"
            :ref="(el) => (categoryInputRefs[category].value = el)"
            v-model:value="categoryInputs[category].inputValue"
            type="text"
            size="small"
            :style="{ width: '78px' }"
            @blur="handleInputConfirm(category)"
            @keyup.enter="handleInputConfirm(category)"
          />
          <a-tag v-else style="background: #fff; border-style: dashed" @click="showInput(category)">
            <plus-outlined />
            New Tag
          </a-tag>
        </div>
        <div class="tags-selector" v-if="editType === 'selection'">
          <template v-for="tag in props.candidates[category]" :key="tag">
            <a-tag
              :color="
                props.tags[category] && props.tags[category].indexOf(tag) !== -1 ? 'blue' : ''
              "
              style="cursor: pointer"
              @click="toggleTagSelection(category, tag)"
            >
              {{ tag }}
            </a-tag>
          </template>
        </div>
      </a-typography-paragraph>
    </a-collapse-panel>
  </a-collapse>
</template>

<style scoped lang="stylus">
.ant-tag
    margin-top 6px
</style>
