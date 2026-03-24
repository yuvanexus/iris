import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: IndexRedirect,
})

function IndexRedirect() {
    return null
}
