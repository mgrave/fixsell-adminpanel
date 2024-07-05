import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { User } from 'src/app/users/interfaces/users.interface';
import { UsersService } from '../../../services/users.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { ValidatorsService } from 'src/app/shared/services/validators.service';
import {
  Chip,
} from '../../../../shared/components/input-chips/input-chips.component';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { AddUserRoleDialogComponent } from '../../../../shared/components/add-user-role-dialog/add-user-role-dialog.component';
@Component({
  selector: 'app-user-create',
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.scss'],
})
export class UserCreateComponent implements OnInit {
  public createUserForm!: FormGroup;
  user: User | null = null;
  roles = ['user', 'admin', 'vendor'];
  isLoadingForm = false;
  selectedRoles: string[] = [];
  passwordFieldFocused = false;
  constructor(
    private router: Router,
    private usersService: UsersService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private validatorsService: ValidatorsService,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.getRoles();
  }

  getRoles(): void {
    this.usersService.getRoles().subscribe(
      (roles: string[]) => {
        this.roles = roles;
        console.log('roles:', this.roles);
      },
      (error) => {
        console.error('Error fetching roles', error);
      }
    );
  }


  initializeForm() {
    this.createUserForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        name: ['', Validators.required],
        password: [
          '',
          [Validators.required, this.validatorsService.isStrongPassword()],
        ],
        repeatPassword: ['', Validators.required],
        isActive: [true],
        roles: [['user'], Validators.required],
      },
      {
        validators: this.validatorsService.passwordsMatch(
          'password',
          'repeatPassword'
        ),
      }
    );
  }

  onIsActiveChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.createUserForm.get('isActive')?.setValue(target.checked);
  }

  isValidField(field: string): boolean | null {
    return this.validatorsService.isValidField(this.createUserForm, field);
  }

  getFieldError(field: string): string | null {
    if (!this.createUserForm.controls[field]) return null;

    const errors = this.createUserForm.controls[field].errors || {};

    console.log(errors);

    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required':
          return 'Este campo es requerido';
        case 'pattern':
          return 'Este campo esta en formato incorrecto';
        case 'maxlength':
          return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
        default:
          return 'Error desconocido';
      }
    }
    return null;
  }

  public isStrongPassword() {
    return (control: AbstractControl) => {
      const value = control.value;

      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumeric = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(
        value
      );

      const passwordValid =
        hasUpperCase &&
        hasLowerCase &&
        hasNumeric &&
        hasSpecialChar &&
        value.length >= 8;

      if (!passwordValid) {
        return { strongPassword: true };
      }

      return null;
    };
  }

  hasUpperCase(value: string) {
    return /[A-Z]/.test(value);
  }

  hasLowerCase(value: string) {
    return /[a-z]/.test(value);
  }

  hasNumeric(value: string) {
    return /[0-9]/.test(value);
  }

  hasSpecialChar(value: string) {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);
  }

  updateValidationStatus() {
    // Do nothing. This is just to trigger change detection.
  }

  roleSelected(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOption = selectElement.value;

    if (selectedOption !== 'addNew' && !this.selectedRoles.includes(selectedOption)) 
    {
      this.selectedRoles = [...this.selectedRoles, selectedOption];
      console.log('selectedRoles:', this.selectedRoles);
      this.createUserForm.get('roles')?.setValue(null);
    } else if (selectedOption === 'addNew') {
      this.openAddUserRoleDialog();
      this.createUserForm.get('roles')?.setValue(null);
    }
  }

  handleItemsChange(selectedItems: string[]) {
    // this.selectedRoles = selectedItems;
    this.createUserForm.controls['roles'].setValue(selectedItems);
  }

  removeRole(role: string): void {
    const index = this.selectedRoles.indexOf(role);

    if (index >= 0) {
      this.selectedRoles.splice(index, 1);
    }
  }

  openAddUserRoleDialog() {
    const dialogRef = this.dialog.open(AddUserRoleDialogComponent);

    dialogRef.afterClosed().subscribe(() => {
      // Refresh the roles here
      this.getRoles();
    });
  }

  submitForm() {
    if (this.createUserForm.invalid) {
      console.log('Invalid form');
      this.createUserForm.markAllAsTouched();
      return;
    }
    this.isLoadingForm = true;

    // Add the selectedRoles to Roles Form Control
    this.createUserForm.get('roles')?.setValue(this.selectedRoles);

    const user = this.createUserForm.value;
    delete user.repeatPassword; // Delete the repeat field
    console.log('user:', user);
    this.http.post(`${environment.baseUrl}/auth/register`, user).subscribe({
      next: (response) => {
        this.isLoadingForm = false;
        this.toastService.showSuccess('Userio creado con exito', 'Close');
        // Navigate to the user detail page
        this.router.navigate(['/users/user']);
        // Reset the form
        this.createUserForm.reset();
      },
      error: (error) => {
        this.isLoadingForm = false;
        this.toastService.showError(
          `Error creando userio: ${error.error.message}`,
          'Close'
        );
        console.error('Error creando userio:', error.error.message);
      },
    });
  }
}
