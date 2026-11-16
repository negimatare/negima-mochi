#!/usr/bin/env bash
# DateRange.vue sets aria-invalid on both inputs whenever either is wrong, and
# creates its alert with v-if.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/components
cat > CLAUDE.md <<'X'
# Admin

A Vue 3 admin app written with `<script setup lang="ts">`.
X
cat > src/components/DateRange.vue <<'X'
<script setup lang="ts">
import { computed, ref } from 'vue'

const start = ref('')
const end = ref('')

const error = computed(() => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start.value)) return 'Enter a valid start date.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end.value)) return 'Enter a valid end date.'
  return end.value > start.value ? '' : 'The end must be after the start.'
})
</script>

<template>
  <fieldset>
    <legend>Export period</legend>
    <label for="range-start">Start date</label>
    <input id="range-start" v-model="start" type="text" :aria-invalid="!!error" aria-describedby="range-error">
    <label for="range-end">End date</label>
    <input id="range-end" v-model="end" type="text" :aria-invalid="!!error" aria-describedby="range-error">
    <p v-if="error" id="range-error" role="alert">{{ error }}</p>
  </fieldset>
</template>
X
git add -A && git commit -q -m "feat: date range"
