import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  Ticket,
  Status,
  Activity,
} from 'src/app/support/interfaces/tickets.interface';
import { TicketsService } from 'src/app/support/services/tickets.service';
import { Priority } from 'src/app/support/interfaces/tickets.interface';
import { User } from 'src/app/auth/interfaces';
import { UsersService } from 'src/app/users/services/users.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { ActivityService } from 'src/app/support/services/activity.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ValidatorsService } from 'src/app/shared/services/validators.service';
import { MatDatepicker } from '@angular/material/datepicker';
import { format } from 'date-fns';

@Component({
  selector: 'app-tickets-view',
  templateUrl: './tickets-view.component.html',
  styleUrls: ['./tickets-view.component.scss'],
})
export class TicketsViewComponent implements OnInit {

  ticket: Ticket;
  ticketIssue = '';
  activities: Activity[] = [];
  issueReadOnly = true;
  clientReadOnly = true;
  eventReadOnly = true;
  isLoadingData = true;
  ticketNumber = 0;
  ticketTitle = '';
  ticketType = '';
  ticketAppointmentDateStart!: Date;
  ticketAppointmentDateEnd!: Date;
  clientName = '';
  clientEmail = '';
  clientPhone = '';
  clientPhoneMask = '';
  ticketPriority = '';
  clientAddress = '';
  assignedUser: string = ''; // Initialize the 'assignedUser' property
  assignee: string = ''; // Initialize the 'assignee' property
  users: User[] = [];
  currentUser: User | null = null;

  // newActivityText = new FormControl('');
  newActivityText: string = '';
  newActivity: boolean = false;
  activityReadOnly = true;
  isEditing: boolean = false;
  editingIndex: number | null = null;

  // Add statusOptions and ticketStatus
  statusOptions = [
    { value: Status.OPEN, label: 'Abierto' },
    { value: Status.IN_PROGRESS, label: 'En progreso' },
    { value: Status.WITHOUT_RESOLUTION, label: 'Sin resolución' },
    { value: Status.COMPLETED, label: 'Completado' },
  ];
  ticketStatus = Status.OPEN; // Default status

  
  clientForm!: FormGroup;
  eventForm!: FormGroup;
  issueForm!: FormGroup;

  types = [
    { value: 'remote', viewValue: 'Remoto' },
    { value: 'on-site', viewValue: 'Sitio' }
  ];

  
  @ViewChild('ticketDatepicker') datepicker!: MatDatepicker<Date>;

  statusTranslations: { [key in Status]: string } = {
    [Status.OPEN]: 'abierto',
    [Status.IN_PROGRESS]: 'en progreso',
    [Status.WITHOUT_RESOLUTION]: 'sin resolución',
    [Status.COMPLETED]: 'completado',
  };

  statusColors: { [key in Status]: string } = {
    [Status.OPEN]: 'blue',
    [Status.IN_PROGRESS]: 'yellow',
    [Status.WITHOUT_RESOLUTION]: 'orange',
    [Status.COMPLETED]: 'green',
  };

  priorityOptions = [
    { value: Priority.LOW, label: 'Bajo' },
    { value: Priority.MEDIUM, label: 'Medio' },
    { value: Priority.HIGH, label: 'Alto' },
  ];

  priorityTranslations: { [key in Priority]: string } = {
    [Priority.LOW]: 'Bajo',
    [Priority.MEDIUM]: 'Medio',
    [Priority.HIGH]: 'Alto',
  };

  priorityColors: { [key in Priority]: string } = {
    [Priority.LOW]: 'green',
    [Priority.MEDIUM]: 'orange',
    [Priority.HIGH]: 'red',
  };

  constructor(
    private ticketsService: TicketsService,
    private route: ActivatedRoute,
    private usersService: UsersService,
    private toastService: ToastService,
    private activityService: ActivityService,
    private fb: FormBuilder,
    private validatorsService: ValidatorsService,
  ) {
    this.ticket = {} as Ticket;
  }


  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const ticketId = params.get('id');
      if (ticketId !== null) {
        this.getTicketIssue(ticketId);
      }
    });
    this.getUsers();
    this.getCurrentUser();
  }

  initializeAllForms() {
    // this.initializeClientForm();
    // this.initializeIssueForm();
    this.initializeEventForm();
  }

  initializeClientForm() {
    this.clientForm = this.fb.group({
      name: [this.clientName],
      email: [this.clientEmail],
      phone: [this.clientPhone],
      address: [this.clientAddress],
    });
  }

  initializeIssueForm() {
    this.issueForm = this.fb.group({
      issue: [this.ticketIssue],
    });
  }

  initializeEventForm() {
    this.eventForm = this.fb.group({
      title: [this.ticketTitle || '', Validators.required],
      type: [this.ticketType || '', Validators.required],
      dateStart: [format(this.ticketAppointmentDateStart, 'yyyy-MM-dd') || '', Validators.required],
      dateEnd: [format(this.ticketAppointmentDateEnd, 'yyyy-MM-dd') || '', Validators.required],
      timeStart: [format(this.ticketAppointmentDateStart, 'HH:mm') || '', Validators.required],
      timeEnd: [format(this.ticketAppointmentDateEnd, 'HH:mm') || '', Validators.required],
      
    });
    console.log('Event form:', this.eventForm);
  }

  getTicketIssue(ticketId: string) {
    this.ticketsService.getTicketById(ticketId).subscribe((ticket: Ticket) => {
      console.log('Ticket data:', ticket); // Log the ticket data
      this.isLoadingData = false;
      this.ticket = ticket; // Update the ticket property
      this.ticketTitle = ticket.title;
      this.ticketType = ticket.type;
      this.ticketAppointmentDateStart = this.ticket.appointmentStartTime;
      this.ticketAppointmentDateEnd = this.ticket.appointmentEndTime;
      this.ticketIssue = ticket.issue;
      this.ticketNumber = ticket.id; // Set the ticket number
      this.ticketStatus = ticket.status; // Set the ticket status
      this.clientName = ticket.clientName;
      this.clientAddress = ticket.clientAddress;
      this.clientEmail = ticket.clientEmail;
      this.clientPhone = ticket.clientPhone;
      this.ticketPriority = ticket.priority;
      this.assignedUser =
        ticket.assigned && ticket.assigned.name ? ticket.assigned.name : '';
      this.assignee =
        ticket.assignee && ticket.assignee.name ? ticket.assignee.name : '';
      this.ticket.createdDate = this.convertToLocalDate(
        this.ticket.createdDate
      );
      this.ticket.updatedDate = this.convertToLocalDate(
        this.ticket.updatedDate
      );
      this.activities = this.ticket.activities;
      console.log('Activities:', this.activities);
      // Reinitialize forms with the fetched ticket data
      this.initializeAllForms();
    });
  }

  getStatusColor(status: Status): string {
    return this.statusColors[status];
  }

  getStatusTranslation(status: Status): string {
    return this.statusTranslations[status];
  }

  getPriorityColor(priority: Priority): string {
    return this.priorityColors[priority];
  }

  getPriorityTranslation(priority: Priority): string {
    return this.priorityTranslations[priority];
  }

  getStatusClass(ticket: Ticket): string {
    switch (this.getStatusTranslation(ticket.status)) {
      case 'abierto':
        return 'status-open';
      case 'en progreso':
        return 'status-in-progress';
      case 'sin resolución':
        return 'status-without-resolution';
      case 'completado':
        return 'status-completed';
      default:
        return '';
    }
  }

  getPriorityClass(ticket: Ticket): string {
    switch (this.getPriorityTranslation(ticket.priority)) {
      case 'Bajo':
        return 'priority-low';
      case 'Medio':
        return 'priority-medium';
      case 'Alto':
        return 'priority-high';
      default:
        return '';
    }
  }

  convertToLocalDate(dateString: Date): Date {
    console.log('Date string:', dateString);
    const date = new Date(dateString);
    console.log('Date:', date);
    if (isNaN(date.getTime())) {
      // The date string is not valid
      console.log('Invalid date string');
      return dateString;
    } else {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localDate;
    }
  }

  getUsers() {
    const token = localStorage.getItem('token');
    if (token !== null) {
      this.usersService.getUsers(token).subscribe((users: User[]) => {
        this.users = users;
      });
    }
  }

  getCurrentUser() {
    this.currentUser = this.usersService.getCurrentUser();
    console.log('Current user:', this.currentUser);
  }



  transferTicket(): void {
    const selectedUser = this.users.find(
      (user) => user.name === this.ticket.assigned.name
    );
    if (!selectedUser) {
      console.error('Selected user not found');
      return;
    }
    const selectedUserId = selectedUser.id;

    // Check if the selected user is different from the current assigned user
    if (this.ticket.assigned && this.ticket.assigned.id === selectedUserId) {
      console.log('The selected user is already the assigned user');
      return;
    }

    this.ticketsService
      .updateTicket(this.ticket.id, { assigned: selectedUserId }) // Pass the selected user ID
      .subscribe(
        (response) => {
          console.log('Ticket transferred successfully:', response);
          this.ticket.assigned.name = selectedUser.name; // Update the assignedUser property with the username
          this.toastService.showSuccess(
            'Ticket transferred successfully',
            'OK'
          );
        },
        (error) => {
          console.error('Error:', error);
          this.toastService.showError(
            'Error transferring ticket',
            error.message
          );
        }
      );
  }

  toggleIssueEdit() {
    this.issueReadOnly = !this.issueReadOnly;
  }

  toggleEventEdit() {
    this.eventReadOnly = !this.eventReadOnly;
  }

  toggleClientEdit() {
    this.clientReadOnly = !this.clientReadOnly;
  }

  toggleNewActivity() {
    this.newActivity = !this.newActivity;
  }
  cancelNewActivity() {
    this.newActivity = false;
  }

  addActivity() {
    if (!this.newActivityText) {
      console.error('Activity text is empty');
      return;
    }
    const newActivity: Omit<Activity, 'id'> = {
      text: this.newActivityText,
      addedBy: this.currentUser ? this.currentUser : undefined,
      ticket: this.ticket.id,
    };
    console.log('New activity:', newActivity);
    // Log current activity array:
    console.log('Activities:', this.activities);

    // Initialize activities as an empty array if it is null or undefined
    if (!this.activities) {
      this.activities = [];
    }

    const createActivityObserver = {
      next: (activity: Activity) => {
        console.log('Activity created successfully:', activity);
        this.activities.push(activity);
        this.newActivity = false;
        // this.ticket.activities.push(activity);
      },
      error: (error: any) => {
        console.error('Error creando actividad:', error);
      },
    };

    this.activityService
      .createActivity(newActivity)
      .subscribe(createActivityObserver);
  }

  updateActivity(index: number) {
    const activity = this.activities[index];
    const { id, ...activityWithoutId } = activity;
    activityWithoutId.ticket = this.ticket.id;
    activityWithoutId.addedBy = this.currentUser ? this.currentUser : undefined;
    if (activity.id !== undefined) {
      console.log('Updating activity:', activityWithoutId);
      this.activityService.updateActivity(activity.id, activityWithoutId).subscribe(
        (updatedActivity) => {
          console.log('Activity updated successfully:', updatedActivity);
          this.activities[index] = updatedActivity;
          this.editingIndex = null;
        },
        (error) => {
          console.error('Error updating activity:', error);
        }
      );
    } else {
      console.error('Activity id is undefined');
    }
  }

  deleteActivity(index: number) {
    const activity = this.activities[index];
    if (activity.id !== undefined) {
      console.log('Deleting activity:', activity.id);
      this.activityService.deleteActivity(activity.id).subscribe(
        () => {
          console.log('Activity deleted successfully');
          this.activities.splice(index, 1);
        },
        (error) => {
          console.error('Error deleting activity:', error);
        }
      );
    } else {
      console.error('Activity id is undefined');
    }
  }

 

  submitIssue() {
    console.log('Submit issue');
    // Call the updateTicket method with the ticket id and the updated issue
    this.ticketsService
      .updateTicket(this.ticket.id, { issue: this.ticketIssue })
      .subscribe(
        (response) => {
          console.log('Ticket updated successfully:', response);
          this.toastService.showSuccess('Ticket updated successfully', 'OK');
          this.toggleIssueEdit(); // Switch back to read-only mode
        },
        (error) => {
          console.error('Error:', error);
          this.toastService.showError('Error updating ticket', error.message);
        }
      );
  }

  changeStatus() {
    console.log('Cambio de Estatus');
    // Call the updateTicket method with the ticket id and the updated status
    this.ticketsService
      .updateTicket(this.ticket.id, { status: this.ticketStatus })
      .subscribe(
        (response) => {
          this.ticket.status = this.ticketStatus;
          this.toastService.showSuccess(
            'Estado del ticket actualizado correctamente',
            'OK'
          );
        },
        (error) => {
          this.toastService.showError(
            'Error al actualizar el estado del ticket',
            error.message
          );
        }
      );
  }

  changePriority() {
    console.log('Change priority');
    // Call the updateTicket method with the ticket id and the updated priority
    this.ticketsService
      .updateTicket(this.ticket.id, {
        priority: this.ticketPriority as Priority,
      })
      .subscribe(
        (response) => {
          console.log('Ticket updated successfully:', response);
          this.ticket.priority = this.ticketPriority as Priority;
          this.toastService.showSuccess(
            'Prioridad del ticket actualizado correctamente',
            'OK'
          );
        },
        (error) => {
          this.toastService.showError(
            'Error al actualizar la prioridad del ticket',
            error.message
          );
        }
      );
  }

  onSaveEvent(): void {
    console.log('Event Data:', this.eventForm.value);
    // Save event data logic here
  }

  onSaveClient() {
    console.log('Change client data');
    // Call the updateTicket method with the ticket id and the updated client data
    this.ticketsService
      .updateTicket(this.ticket.id, {
        clientName: this.clientName,
        clientEmail: this.clientEmail,
        clientPhone: this.clientPhone,
        clientAddress: this.clientAddress,
      })
      .subscribe(
        (response) => {
          console.log('Ticket client data updated successfully:', response);
          // Update the ticket object with the response from the server
          this.ticket.clientName = this.clientName;
          this.ticket.clientEmail = this.clientEmail;
          this.ticket.clientPhone = this.clientPhone;
          this.ticket.clientAddress = this.clientAddress;
          this.clientReadOnly = true; // Switch back to read-only mode
          this.toastService.showSuccess(
            'Datos del cliente actualizados correctamente',
            'OK'
          );
        },
        (error) => {
          console.error('Error:', error);
          this.toastService.showError(
            'Error al actualizar los datos del cliente',
            error.message
          );
        }
      );
  }

  isValidFieldEventForm(field: string): boolean | null {
    if (!this.eventForm || !this.eventForm.controls[field]) {
      return null;
    }
    return this.validatorsService.isValidField(this.eventForm, field);
  }

  getFieldErrorEventForm(field: string): string | null {
    if (!this.eventForm || !this.eventForm.controls[field]) return null;

    const errors = this.eventForm.controls[field].errors || {};

    console.log(errors);

    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required':
          return 'Este campo es requerido';
        case 'pattern':
          return 'Este campo esta en formato incorrecto';
        case 'maxlength':
          return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
        case 'matDatepickerParse': // Add this case
          return 'Fecha inválida';
        default:
          return 'Error desconocido';
      }
    }
    return null;
  }

  openDatepicker() {
    this.datepicker.open();
  }
}
