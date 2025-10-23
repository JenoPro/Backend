// Updated AddEmployee.vue with branchId handling

export default {
  name: 'AddEmployee',
  props: {
    modelValue: Boolean,
    employee: Object,
    isEditMode: Boolean,
    saving: Boolean,
    availablePermissions: Array,
    selectedPermissions: Array,
    currentBranchId: Number // Add this prop
  },
  emits: ['update:modelValue', 'save', 'close', 'toggle-permission'],
  data() {
    return {
      formValid: false,
      employeeForm: {
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: ''
      },
      rules: {
        required: value => !!value || 'This field is required',
        email: value => {
          const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          return pattern.test(value) || 'Invalid email address'
        },
        phone: value => {
          const pattern = /^09\d{9}$/
          return pattern.test(value) || 'Phone must be 11 digits starting with 09'
        }
      }
    }
  },
  watch: {
    employee: {
      handler(newEmployee) {
        if (newEmployee && this.isEditMode) {
          this.employeeForm = {
            firstName: newEmployee.first_name || '',
            lastName: newEmployee.last_name || '',
            email: newEmployee.email || '',
            phoneNumber: newEmployee.phone_number || ''
          }
        } else if (!this.isEditMode) {
          this.employeeForm = {
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: ''
          }
        }
      },
      immediate: true
    }
  },
  methods: {
    isPermissionSelected(permission) {
      return this.selectedPermissions && this.selectedPermissions.includes(permission)
    },
    
    handleSave() {
      if (this.formValid) {
        // Include branchId in the form data
        const employeeData = {
          ...this.employeeForm,
          branchId: this.currentBranchId || 1 // Fallback to 1 if not provided
        }
        this.$emit('save', employeeData)
      }
    }
  }
}