---
name: forms
description: Form conventions for React apps in this stack that use React Hook Form with Zod — the schema as the one source of the form's types and rules, zodResolver with defaultValues, register for native-backed Fluent inputs and Controller for the rest, errors through Fluent Field, i18n keys as messages, and submit state from formState. Use when building or editing a form.
user-invocable: false
paths:
  - "**/*.tsx"
  - "**/*.schema.ts"
metadata:
  mochi-requires: "react-hook-form zod"
---

# Forms

## Schema first

The Zod schema in `X.schema.ts`, beside the form, is the one source of the
form's types and rules. No hand-written interface repeats it.

```ts
export const profileSchema = z.object({
  displayName: z.string().trim().min(1, { error: 'profile.errors.nameRequired' }),
  email: z.email({ error: 'profile.errors.emailInvalid' }),
  language: z.enum(['en', 'ja']),
});
export type ProfileValues = z.infer<typeof profileSchema>;
```

- Zod 4 forms: top-level `z.email()`, `z.url()`, `z.uuid()` instead of the
  deprecated `z.string().email()`; custom text through `error`, not the
  deprecated `message`.
- Error texts are i18n keys, translated where they render: the schema stays
  free of `t()` and of the current language. With typed i18n resources,
  narrow the key where it renders, not in the schema.
- A schema that transforms (`z.coerce`, `.transform`) types the form with all
  three generics: `useForm<z.input<typeof s>, unknown, z.output<typeof s>>`.

## Wiring

Every field gets a `defaultValues` entry: Fluent inputs decide on their first
render whether they are controlled, so a `Controller` field that starts
`undefined` stays uncontrolled and ignores `reset()` and `setValue()`.

```tsx
const { control, register, handleSubmit, formState: { errors } } = useForm<ProfileValues>({
  resolver: zodResolver(profileSchema),  // from '@hookform/resolvers/zod'
  defaultValues: { displayName: '', email: '', language: 'en' },
});

<Field
  label={t('profile.displayName')}
  validationMessage={errors.displayName?.message && t(errors.displayName.message)}
>
  <Input {...register('displayName')} />
</Field>

<Controller
  name="language"
  control={control}
  render={({ field, fieldState }) => (
    <Field
      label={t('profile.language')}
      validationMessage={fieldState.error?.message && t(fieldState.error.message)}
    >
      <Dropdown
        ref={field.ref}
        selectedOptions={[field.value]}
        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
        onBlur={field.onBlur}
      >
        <Option value="en">English</Option>
        <Option value="ja">日本語</Option>
      </Dropdown>
    </Field>
  )}
/>
```

- `register` for `Input` and `Textarea`, which wrap a native element and pass
  the native event first; `Controller` for `Dropdown`, `Combobox`, and other
  non-native inputs.
- Errors reach the user through `Field`'s `validationMessage`, from
  `formState.errors` or `fieldState.error`; no separate error element.

## Submit

`handleSubmit` passes the schema's output type. The pending state is
`formState.isSubmitting`, not a separate `useState`; a failure the server
reports goes to `setError('root', …)` and renders in a `MessageBar`.
