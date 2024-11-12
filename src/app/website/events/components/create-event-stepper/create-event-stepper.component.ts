// create-event-stepper.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  Validators,
  FormControl,
  AbstractControl,
} from '@angular/forms';
import { Observable, forkJoin, throwError } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { EventService } from '../../services/event.service';
import { DealService } from 'src/app/website/deal/services/deal.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { MatStepper } from '@angular/material/stepper';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'app-create-event-stepper',
  templateUrl: './create-event-stepper.component.html',
  styleUrls: ['./create-event-stepper.component.scss'],
})
export class CreateEventStepperComponent implements OnInit {
  isLinear = true;
  stepperOrientation!: Observable<'horizontal' | 'vertical'>;

  // Separate FormGroups for each step
  eventDetailsForm!: FormGroup; // FormGroup for Step 1: Create Event
  promotionsForm!: FormGroup; // FormGroup for Step 2: Create Promotions

  isSubmitting = false;

  // Arrays to store autocomplete observables per deal
  filteredProductNames: Observable<string[]>[] = [];

  @ViewChild('stepper') private stepper!: MatStepper;

  constructor(
    private fb: FormBuilder,
    private breakpointObserver: BreakpointObserver,
    private eventService: EventService,
    private dealService: DealService,
    private toastService: ToastService,
  ) {
    this.stepperOrientation = this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(map(({ matches }) => (matches ? 'vertical' : 'horizontal')));
  }

  ngOnInit(): void {
    this.initializeForms();
  }

  /**
   * Initializes the separate FormGroups for each step.
   */
  initializeForms(): void {
    // Initialize Step 1 FormGroup: Event Details
    this.eventDetailsForm = this.fb.group({
      title: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      description: ['', Validators.required],
      image: [null, Validators.required],
    });

    // Initialize Step 2 FormGroup: Promotions (Deals)
    this.promotionsForm = this.fb.group({
      deals: this.fb.array([]),
    });
  }

  /**
   * Getter for promotions FormArray.
   */
  get deals(): FormArray {
    return this.promotionsForm.get('deals') as FormArray;
  }

  /**
   * Creates a new deal FormGroup.
   */
  createDeal(): FormGroup {
    return this.fb.group({
      type: ['multifuncional', Validators.required],
      selection: ['', Validators.required],
      printerPrice: [{ value: '', disabled: true }, Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      dealCurrency: ['MXN', Validators.required],
      discountPercentage: [
        '',
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      description: ['', Validators.required],
    });
  }

  /**
   * Handles type change in a deal.
   * @param index Index of the deal in the FormArray.
   * @param event The change event from the mat-select.
   */
  onTypeChange(index: number, event: MatSelectChange): void {
    const dealGroup = this.deals.at(index) as FormGroup;
    const selectionControl = dealGroup.get('selection') as FormControl;

    // Reset selection when type changes
    selectionControl.setValue('');

    this.filteredProductNames[index] = selectionControl.valueChanges.pipe(
      startWith(''),
      switchMap((inputValue: string) => {
        return event.value === 'multifuncional'
          ? this.dealService.getAllPrinterNames()
          : this.dealService.getAllConsumiblesNames();
      }),
      map((names: string[]) =>
        this._filter(selectionControl.value || '', names),
      ),
    );
  }

  /**
   * Adds a new deal to the promotions FormArray.
   */
  addDeal(): void {
    this.deals.push(this.createDeal());
    this.setupProductNameAutocomplete(this.deals.length - 1);
  }

  /**
   * Removes a deal from the promotions FormArray.
   * @param index Index of the deal to remove.
   */
  removeDeal(index: number): void {
    this.deals.removeAt(index);
    this.filteredProductNames.splice(index, 1);
  }

  /**
   * Sets up autocomplete for product names in a deal.
   * @param index Index of the deal in the FormArray.
   */
  setupProductNameAutocomplete(index: number): void {
    const dealGroup = this.deals.at(index) as FormGroup;
    const selectionControl = dealGroup.get('selection') as FormControl;

    this.filteredProductNames[index] = selectionControl.valueChanges.pipe(
      startWith(''),
      switchMap((value: string) =>
        this.dealService
          .getAllPrinterNames()
          .pipe(map((names) => this._filter(value, names))),
      ),
    );

    // Listen for selection changes to fetch printer price
    selectionControl.valueChanges.subscribe((printerName: string) => {
      this.dealService.getPrinterPrice(printerName).subscribe(
        (price) => {
          dealGroup.get('printerPrice')?.setValue(price);
          dealGroup.get('price')?.setValue(price);
        },
        (error) => {
          console.error(error);
          this.toastService.showError(
            'Error al obtener el precio de la impresora',
            'Cerrar',
          );
        },
      );
    });
  }

  /**
   * Filters the autocomplete options based on user input.
   * @param value User input value.
   * @param options List of available options.
   */
  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter((option) =>
      option.toLowerCase().includes(filterValue),
    );
  }

  /**
   * Skips the promotions step and moves to the next step.
   */
  skipPromotions(): void {
    this.stepper.next();
  }

  /**
   * Handles the image upload event.
   * @param event The uploaded image URL or File.
   */
  onFileUploaded(event: any): void {
    const file = Array.isArray(event) ? event[0] : event; // Expecting a single file
    if (file) {
      // If 'file' is a File object, convert it to a URL for preview
      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          this.eventDetailsForm.patchValue({ image: reader.result as string });
        };
        reader.readAsDataURL(file);
      } else {
        // If 'file' is already a URL
        this.eventDetailsForm.patchValue({ image: file });
      }
    }
  }

  /**
   * Removes the uploaded image from the form.
   */
  onRemoveImage(): void {
    this.eventDetailsForm.patchValue({ image: null });
  }

  /**
   * Submits the form to create a new event along with its promotions.
   */
  onSubmit(): void {
    // Validate both forms
    if (
      this.eventDetailsForm.invalid ||
      (this.deals.length > 0 && this.promotionsForm.invalid)
    ) {
      this.eventDetailsForm.markAllAsTouched();
      this.promotionsForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const eventData: any = {
      title: this.eventDetailsForm.value.title,
      startDate: new Date(this.eventDetailsForm.value.startDate),
      endDate: new Date(this.eventDetailsForm.value.endDate),
      description: this.eventDetailsForm.value.description,
      image: this.eventDetailsForm.value.image,
      dealIds: [], // Will populate after creating deals
    };

    const dealsFormArray = this.deals.controls as FormGroup[];
    const createDealObservables: Observable<any>[] = [];

    if (dealsFormArray.length > 0) {
      // Create deals first
      dealsFormArray.forEach((dealGroup) => {
        const deal = dealGroup.value;
        const dealData: any = {
          printer: '', // Will set after fetching printer ID
          dealStartDate: eventData.startDate.toISOString(),
          dealEndDate: eventData.endDate.toISOString(),
          dealPrice: Number(deal.price),
          dealCurrency: deal.dealCurrency,
          dealDiscountPercentage: Number(deal.discountPercentage),
          dealDescription: deal.description,
        };

        // Find printer ID by name
        createDealObservables.push(
          this.dealService.findPrinterIdByName(deal.selection).pipe(
            switchMap((printerId: string) => {
              if (printerId) {
                dealData.printer = printerId;

                // Console log the dealData
                console.log('Submitting deal data:', dealData);

                return this.dealService.submitDealCreateForm(dealData);
              } else {
                // Use throwError instead of Observable.throw
                return throwError('Printer not found');
              }
            }),
          ),
        );
      });

      // After all deals are created, create the event and associate the deals
      forkJoin(createDealObservables).subscribe(
        (createdDeals) => {
          const dealIds = createdDeals.map((deal) => deal.id);
          eventData.dealIds = dealIds; // Use dealIds instead of deals

          // Console log the eventData before creating the event
          console.log('Submitting event data:', eventData);

          // Now create the event with associated deal IDs
          this.createEvent(eventData);
        },
        (error) => {
          console.error('Error creating deals:', error);
          this.isSubmitting = false;
          this.toastService.showError(
            'Error creando las promociones',
            'Cerrar',
          );
        },
      );
    } else {
      // No deals to create, proceed to create the event
      this.createEvent(eventData);
    }
  }

  /**
   * Creates the event and associates the deals.
   * @param eventData The event data to submit.
   */
  createEvent(eventData: any): void {
    // Console log the eventData
    console.log('Submitting event data:', eventData);

    this.eventService.create(eventData).subscribe(
      () => {
        this.isSubmitting = false;
        this.toastService.showSuccess(
          'Evento y promociones creados exitosamente',
          'Cerrar',
        );
        // Reset the forms and stepper
        this.eventDetailsForm.reset();
        this.deals.clear();
        this.filteredProductNames = [];
        this.stepper.reset();
      },
      (error) => {
        console.error('Error creating event:', error);
        this.isSubmitting = false;
        this.toastService.showError('Error creando el evento', 'Cerrar');
      },
    );
  }

  /**
   * Checks if a form field is valid.
   * @param formGroup The form group containing the field.
   * @param field The field name.
   * @returns True if the field is invalid and touched or dirty.
   */
  isValidField(formGroup: AbstractControl, field: string): boolean {
    const control = formGroup.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Retrieves the error message for a form field.
   * @param formGroup The form group containing the field.
   * @param field The field name.
   * @returns The error message string.
   */
  getFieldError(formGroup: AbstractControl, field: string): string {
    const controlErrors = formGroup.get(field)?.errors;
    if (controlErrors?.['required']) {
      return 'Este campo es requerido';
    }
    if (controlErrors?.['min']) {
      return 'El valor debe ser positivo';
    }
    if (controlErrors?.['max']) {
      return 'El valor no puede exceder 100';
    }
    return '';
  }

  /**
   * Calculates the final price based on discount percentage.
   * @param index Index of the deal in the FormArray.
   */
  calculatePrice(index: number): void {
    const dealGroup = this.deals.at(index) as FormGroup;
    const printerPrice = Number(dealGroup.get('printerPrice')?.value);
    const discountPercentage = Number(
      dealGroup.get('discountPercentage')?.value,
    );

    if (printerPrice && discountPercentage) {
      const discountAmount = (printerPrice * discountPercentage) / 100;
      const finalPrice = printerPrice - discountAmount;
      dealGroup.get('price')?.setValue(finalPrice.toFixed(2));
    }
  }

  /**
   * Calculates the discount percentage based on the entered price.
   * @param index Index of the deal in the FormArray.
   */
  calculatePercentage(index: number): void {
    const dealGroup = this.deals.at(index) as FormGroup;
    const printerPrice = Number(dealGroup.get('printerPrice')?.value);
    const price = Number(dealGroup.get('price')?.value);

    if (printerPrice && price) {
      const discountAmount = printerPrice - price;
      const discountPercentage = (discountAmount / printerPrice) * 100;
      dealGroup
        .get('discountPercentage')
        ?.setValue(discountPercentage.toFixed(0));
    }
  }
}
