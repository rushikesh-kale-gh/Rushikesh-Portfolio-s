import { LightningElement, api } from 'lwc';
import createUserAccount from '@salesforce/apex/DailyTrackerController.createUserAccount';
import signInUserAccount from '@salesforce/apex/DailyTrackerController.signInUserAccount';
import getUserSecurityQuestion from '@salesforce/apex/DailyTrackerController.getUserSecurityQuestion';
import resetPassword from '@salesforce/apex/DailyTrackerController.resetPassword';

export default class AuthenticationScreen extends LightningElement {
    // State management
    isCreateMode = false;
    isForgotPassword = false;

    // Login form fields
    loginUsername = '';
    loginPassword = '';
    loginError = '';

    // Create form fields
    createUsername = '';
    createPassword = '';
    createPasswordConfirm = '';
    createSecurityQuestion = '';
    createSecurityAnswer = '';
    createError = '';

    // Forgot password form fields
    forgotUsername = '';
    securityQuestion = '';
    forgotSecurityAnswer = '';
    forgotNewPassword = '';
    forgotError = '';

    @api onLoginSuccess = null;

    // Login Handlers
    handleLoginUsernameChange(event) {
        this.loginUsername = event.target.value;
    }

    handleLoginPasswordChange(event) {
        this.loginPassword = event.target.value;
    }

    handleSignIn() {
        this.loginError = '';

        if (!this.loginUsername || !this.loginPassword) {
            this.loginError = 'Please enter username and password';
            return;
        }

        signInUserAccount({ username: this.loginUsername, password: this.loginPassword })
            .then((response) => {
                if (response.success) {
                    // Emit event to parent with userId
                    this.dispatchEvent(
                        new CustomEvent('loginsuccess', {
                            detail: { userId: response.userId, username: this.loginUsername }
                        })
                    );
                } else {
                    this.loginError = response.message || 'Login failed';
                }
            })
            .catch((error) => {
                this.loginError = 'Error: ' + (error.body?.message || error.message);
            });
    }

    handleCreateMode() {
        this.isCreateMode = true;
        this.loginError = '';
        this.createError = '';
    }

    handleForgotPassword() {
        this.isForgotPassword = true;
        this.forgotError = '';
    }

    // Create Account Handlers
    handleCreateUsernameChange(event) {
        this.createUsername = event.target.value;
    }

    handleCreatePasswordChange(event) {
        this.createPassword = event.target.value;
    }

    handleCreatePasswordConfirmChange(event) {
        this.createPasswordConfirm = event.target.value;
    }

    handleCreateSecurityQuestionChange(event) {
        this.createSecurityQuestion = event.target.value;
    }

    handleCreateSecurityAnswerChange(event) {
        this.createSecurityAnswer = event.target.value;
    }

    handleCreateAccount() {
        this.createError = '';

        if (!this.createUsername || !this.createPassword || !this.createPasswordConfirm || !this.createSecurityQuestion || !this.createSecurityAnswer) {
            this.createError = 'Please fill all fields';
            return;
        }

        if (this.createPassword !== this.createPasswordConfirm) {
            this.createError = 'Passwords do not match';
            return;
        }

        createUserAccount({
            username: this.createUsername,
            password: this.createPassword,
            securityQuestion: this.createSecurityQuestion,
            securityAnswer: this.createSecurityAnswer
        })
            .then((response) => {
                if (response.success) {
                    this.dispatchEvent(
                        new CustomEvent('accountcreated', {
                            detail: { userId: response.userId, username: this.createUsername }
                        })
                    );
                    this.isCreateMode = false;
                } else {
                    this.createError = response.message || 'Failed to create account';
                }
            })
            .catch((error) => {
                this.createError = 'Error: ' + (error.body?.message || error.message);
            });
    }

    handleBackToLogin() {
        this.isCreateMode = false;
        this.createError = '';
        this.loginError = '';
    }

    // Forgot Password Handlers
    handleForgotUsernameChange(event) {
        this.forgotUsername = event.target.value;
        if (this.forgotUsername) {
            getUserSecurityQuestion({ username: this.forgotUsername })
                .then((response) => {
                    if (response.found) {
                        this.securityQuestion = response.question;
                    }
                })
                .catch(() => {
                    this.securityQuestion = '';
                });
        }
    }

    handleForgotAnswerChange(event) {
        this.forgotSecurityAnswer = event.target.value;
    }

    handleForgotNewPasswordChange(event) {
        this.forgotNewPassword = event.target.value;
    }

    handleResetPassword() {
        this.forgotError = '';

        if (!this.forgotUsername || !this.forgotSecurityAnswer || !this.forgotNewPassword) {
            this.forgotError = 'Please fill all fields';
            return;
        }

        resetPassword({
            username: this.forgotUsername,
            securityQuestion: this.securityQuestion,
            securityAnswer: this.forgotSecurityAnswer,
            newPassword: this.forgotNewPassword
        })
            .then((response) => {
                if (response.success) {
                    this.forgotError = '';
                    this.isForgotPassword = false;
                    this.loginError = 'Password reset successful. Please sign in.';
                } else {
                    this.forgotError = response.message || 'Failed to reset password';
                }
            })
            .catch((error) => {
                this.forgotError = 'Error: ' + (error.body?.message || error.message);
            });
    }

    handleBackFromForgot() {
        this.isForgotPassword = false;
        this.forgotUsername = '';
        this.securityQuestion = '';
        this.forgotSecurityAnswer = '';
        this.forgotNewPassword = '';
        this.forgotError = '';
    }
}
