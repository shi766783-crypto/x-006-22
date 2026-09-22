<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFamilyStore } from '../../stores/useFamilyStore'
import type { MedicationPlan } from '../../types'
import { normalizeTimes, suggestTime, validateTimes } from '../../utils/planTime'

const props = defineProps<{ plan?: MedicationPlan | null }>()
const emit = defineEmits<{
  (e: 'save', data: Omit<MedicationPlan, 'id'>): void
  (e: 'close'): void
}>()

const store = useFamilyStore()

const form = reactive({
  memberId: props.plan?.memberId ?? store.state.members[0]?.id ?? '',
  medicineId: props.plan?.medicineId ?? store.state.medicines[0]?.id ?? '',
  dosage: props.plan?.dosage ?? '',
  // 保留已保存的原始顺序（含重复项），让用户能看到并修正问题
  times: props.plan?.times?.length ? [...props.plan.times] : ['08:00'],
  startDate: props.plan?.startDate ?? '',
  endDate: props.plan?.endDate ?? '',
})

// 编辑已存在问题的计划时，一打开就展示错误；新建时等点击保存后再校验
const triedSubmit = ref(Boolean(props.plan && validateTimes(props.plan.times ?? []).issues.length))

const validation = computed(() => validateTimes(form.times))
const showErrors = computed(() => triedSubmit.value)

const rowKinds = computed<Record<number, 'invalid' | 'duplicate'>>(() => {
  const map: Record<number, 'invalid' | 'duplicate'> = {}
  // 先标重复，非法格式随后覆盖（非法优先提示修正）
  for (const issue of validation.value.issues) {
    if (issue.kind === 'duplicate') {
      for (const i of issue.indices) map[i] = 'duplicate'
    }
  }
  for (const issue of validation.value.issues) {
    if (issue.kind === 'invalid') {
      for (const i of issue.indices) map[i] = 'invalid'
    }
  }
  return map
})

function addTime() {
  form.times.push(suggestTime(form.times))
}

function removeTime(index: number) {
  if (form.times.length <= 1) return
  form.times.splice(index, 1)
}

const formError = ref('')

function submit() {
  triedSubmit.value = true
  formError.value = ''

  if (!form.memberId || !form.medicineId) {
    formError.value = '请选择家庭成员和药品'
    return
  }

  const result = validation.value
  if (!result.valid) {
    formError.value = result.summary
    return
  }

  emit('save', {
    memberId: form.memberId,
    medicineId: form.medicineId,
    dosage: form.dosage.trim(),
    times: normalizeTimes(form.times),
    startDate: form.startDate,
    endDate: form.endDate,
  })
}
</script>

<template>
  <div class="form-grid">
    <div class="form-group">
      <label class="form-label">家庭成员 *</label>
      <select v-model="form.memberId" class="input">
        <option v-for="m in store.state.members" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">药品 *</label>
      <select v-model="form.medicineId" class="input">
        <option v-for="m in store.state.medicines" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">每次剂量</label>
      <input v-model="form.dosage" class="input" placeholder="如：1粒 / 5ml" />
    </div>
    <div class="form-group">
      <label class="form-label">开始日期</label>
      <input v-model="form.startDate" type="date" class="input" />
    </div>
    <div class="form-group">
      <label class="form-label">结束日期</label>
      <input v-model="form.endDate" type="date" class="input" />
    </div>
    <div class="form-group span-2">
      <label class="form-label">每日服药时间（至少一个，且不可重复）</label>
      <div class="time-list">
        <div v-for="(_, i) in form.times" :key="i" class="time-col">
          <div class="time-row">
            <input
              v-model="form.times[i]"
              type="time"
              class="input"
              :class="{
                'input-error': showErrors && rowKinds[i] === 'invalid',
                'input-warning': showErrors && rowKinds[i] === 'duplicate',
              }"
              :aria-invalid="Boolean(showErrors && validation.rowErrors[i])"
            />
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              :disabled="form.times.length <= 1"
              :title="form.times.length <= 1 ? '至少保留一个服药时间点' : '移除该时间点'"
              @click="removeTime(i)"
            >
              移除
            </button>
          </div>
          <div v-if="showErrors && validation.rowErrors[i]" class="row-error">
            ⚠️ {{ validation.rowErrors[i] }}
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-ghost add-time" @click="addTime">
          + 添加时间点
        </button>
      </div>
      <div v-if="showErrors && !validation.valid && validation.summary" class="form-error">
        {{ validation.summary }}
      </div>
    </div>
  </div>
  <div v-if="formError && !validation.issues.length" class="form-error form-error-bottom">
    {{ formError }}
  </div>
  <div class="form-actions">
    <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
    <button type="button" class="btn btn-primary" @click="submit">保存</button>
  </div>
</template>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.time-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.time-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.time-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.add-time {
  align-self: flex-start;
}
.input-error {
  border-color: var(--danger-color);
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.12);
}
.input-warning {
  border-color: var(--warning-color);
  box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.15);
}
.row-error {
  font-size: 12px;
  color: var(--danger-color);
  line-height: 1.4;
}
.form-error {
  margin-top: 8px;
  font-size: 13px;
  color: var(--danger-color);
}
.form-error-bottom {
  margin-top: 12px;
}
</style>
