// src/stores/navigation.js
import { defineStore } from 'pinia'

export const useNavigationStore = defineStore('navigation', {
    state: () => ({
        isNavigationOpen: false
    }),
    actions: {
        toggleNavigation() {
            this.isNavigationOpen = !this.isNavigationOpen
        },
        closeNavigation() {
            this.isNavigationOpen = false
        },
        openNavigation() {
            this.isNavigationOpen = true
        }
    }
})
