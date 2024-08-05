import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { Status } from 'src/app/support/interfaces/tickets.interface';
import { CalendarView } from 'angular-calendar';
import { CalendarEvent } from 'angular-calendar';
import { Ticket, Priority } from '../../../interfaces/tickets.interface';
import { TicketsService } from 'src/app/support/services/tickets.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Observable } from 'rxjs';
@Component({
  selector: 'app-tickets-dashboard',
  templateUrl: './tickets-dashboard.component.html',
  styleUrls: ['./tickets-dashboard.component.scss'],
})
export class TicketsDashboardComponent implements OnInit {
  public loadTicketsEvent = new EventEmitter<Status>();
  view: CalendarView = CalendarView.Week;
  constructor(
    private router: Router,
    private authService: AuthService,
    private ticketsService: TicketsService
  ) {
    /*...*/
  }

  isLoadingData = false;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  isLowPriorityTicketListVisible: boolean = false;
  isMediumPriorityTicketListVisible: boolean = false;
  isHighPriorityTicketListVisible: boolean = false;
  openTicketsCount: number = 0;
  closedTicketsCount: number = 0;
  highPriorityTicketsCount: number = 0;
  mediumPriorityTicketsCount: number = 0;
  lowPriorityTicketsCount: number = 0;
  allTickets: Ticket[] = [];
  closedTickets: Ticket[] = [];
  highPriorityTickets: Ticket[] = [];
  mediumPriorityTickets: Ticket[] = [];
  lowPriorityTickets: Ticket[] = [];

  statusTranslations: { [key in Status]: string } = {
    [Status.OPEN]: 'ABIERTO',
    [Status.IN_PROGRESS]: 'EN PROGRESO',
    [Status.WITHOUT_RESOLUTION]: 'SIN RESOLUCIÓN',
    [Status.COMPLETED]: 'COMPLETADO',
  };

  ngOnInit() {
    this.loadUserTickets();
  }

  loadUserTickets() {
    const user = this.authService.getCurrentUser();
    if (user) {
      const userRoles = this.authService.getCurrentUserRoles();
      const isAdmin = userRoles.includes('admin');
      let ticketsObservable: Observable<Ticket[]>;
      if (isAdmin) {
        ticketsObservable = this.ticketsService.getAllTickets();
      } else {
        ticketsObservable = this.ticketsService.getAllTicketsForUser(user.id);
      }
      ticketsObservable.subscribe(
        (tickets) => {
          this.allTickets = tickets.filter(ticket => ticket.status !== Status.COMPLETED);
          this.closedTickets = tickets.filter(ticket => ticket.status === Status.COMPLETED);
          console.log('Tickets:', this.allTickets); // Log tickets data to inspect it
          this.highPriorityTickets = this.allTickets.filter(ticket => ticket.priority === Priority.HIGH);
          this.mediumPriorityTickets = this.allTickets.filter(ticket => ticket.priority === Priority.MEDIUM);
          this.lowPriorityTickets = this.allTickets.filter(ticket => ticket.priority === Priority.LOW);
          this.highPriorityTicketsCount = this.highPriorityTickets.length;
          this.mediumPriorityTicketsCount = this.mediumPriorityTickets.length;
          this.lowPriorityTicketsCount = this.lowPriorityTickets.length;
          this.populateCalendarWithTickets(tickets);
          this.openTicketsCount = tickets.filter((ticket) =>
            [
              Status.OPEN,
              Status.IN_PROGRESS,
              Status.WITHOUT_RESOLUTION,
            ].includes(ticket.status)
          ).length;
          this.closedTicketsCount = tickets.filter(
            (ticket) => ticket.status === Status.COMPLETED
          ).length;
        },
        (error) => {
          console.error('Error:', error);
        }
      );
    } else {
      console.error('No current user');
    }
  }

  populateCalendarWithTickets(tickets: any[]) {
    this.events = tickets.map((ticket) => {
      console.log('Ticket:', ticket); // Log ticket data to inspect it
      return {
        id: ticket.id,
        start: new Date(ticket.appointmentStartTime),
        end: new Date(ticket.appointmentEndTime),
        title: ticket.title,
        clientName: ticket.clientName,
        clientPhone: ticket.clientPhone,
        clientAddress: ticket.clientAddress,
        priority: ticket.priority,
        assigned: ticket.assigned ? ticket.assigned.name : '', // Ensure assignee is included
      };
    });
    console.log('Events:', this.events); // Log events data to inspect it
  }

  setDayView(): void {
    this.view = CalendarView.Day;
  }

  setWeekView(): void {
    this.view = CalendarView.Week;
  }

  setMonthView(): void {
    this.view = CalendarView.Month;
  }

  today(): void {
    this.viewDate = new Date();
    this.view = CalendarView.Day;
  }

  previousDay() {
    const date = new Date(this.viewDate);
    date.setDate(date.getDate() - 1);
    this.viewDate = date;
  }

  nextDay() {
    const date = new Date(this.viewDate);
    date.setDate(date.getDate() + 1);
    this.viewDate = date;
  }

  previousWeek() {
    const date = new Date(this.viewDate);
    date.setDate(date.getDate() - 7);
    this.viewDate = date;
  }

  nextWeek() {
    const date = new Date(this.viewDate);
    date.setDate(date.getDate() + 7);
    this.viewDate = date;
  }

  previousMonth() {
    const date = new Date(this.viewDate);
    date.setMonth(date.getMonth() - 1);
    this.viewDate = date;
  }

  nextMonth() {
    const date = new Date(this.viewDate);
    date.setMonth(date.getMonth() + 1);
    this.viewDate = date;
  }

  setView() {
    switch (this.view) {
      case 'day':
        this.setDayView();
        break;
      case 'week':
        this.setWeekView();
        break;
      case 'month':
        this.setMonthView();
        break;
    }
  }

  eventClicked({ event }: { event: CalendarEvent }): void {
    console.log('Event clicked', event);
    this.router.navigate(['/support/tickets/', event.id]);
  }

  dayClicked(date: Date): void {
    this.viewDate = date;
    this.view = CalendarView.Day;
  }

  addTicket() {
    console.log('Add ticket');
    this.router.navigate(['/support/tickets/create']);
  }

  navigateOpenTickets() {
    console.log('Open tickets');
    console.log('routing to: /support/tickets/list');
    this.router.navigate(['/support/tickets/list'], {
      queryParams: {
        status: [
          Status.OPEN,
          Status.IN_PROGRESS,
          Status.WITHOUT_RESOLUTION,
        ].join(','),
      },
    });
    this.loadTicketsEvent.emit(Status.OPEN);
  }

  navigateClosedTickets() {
    console.log('Closed tickets');
    console.log('routing to: /support/tickets/list');
    this.router.navigate(['/support/tickets/list'], {
      queryParams: { status: 'completed' },
    });
    this.loadTicketsEvent.emit(Status.COMPLETED);
  }

  seeTicket(ticket: Ticket) {
    this.router.navigate(['/support/tickets/' + ticket.id]);
  }

  getStatusClass(ticket: Ticket): string {
    switch (this.getStatusTranslation(ticket.status)) {
      case 'ABIERTO':
        return 'status-open';
      case 'EN PROGRESO':
        return 'status-in-progress';
      case 'SIN RESOLUCIÓN':
        return 'status-without-resolution';
      case 'COMPLETADO':
        return 'status-completed';
      default:
        return '';
    }
  }

  getStatusTranslation(status: Status): string {
    return this.statusTranslations[status];
  }
}
