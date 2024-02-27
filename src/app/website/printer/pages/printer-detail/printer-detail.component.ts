import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Printer } from 'src/app/website/interfaces/printer.interface';
import { SharedService } from 'src/app/shared/services/shared.service';
import { PrinterService } from '../../services/printer.service';

@Component({
  selector: 'app-printer-detail',
  templateUrl: './printer-detail.component.html',
  styleUrls: ['./printer-detail.component.scss'],
})
export class PrinterDetailComponent implements OnInit {
  printer: Printer | null = null;
  currentImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private sharedService: SharedService,
    private printerService: PrinterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getPrinter();
  }

  getPrinter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.printerService.getPrinter(id).subscribe((printer) => {
        this.printer = printer;
        console.log('Printer:', printer);
        this.sharedService.changePrinterModel(printer.model);
      });
    }
  }

  getDealDuration(): number {
    if (this.printer && this.printer.deal) {
      const startDate = new Date(this.printer.deal.dealStartDate);
      const endDate = new Date(this.printer.deal.dealEndDate);
      const diff = endDate.getTime() - startDate.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/website', 'printers', id, 'edit']);
  }
}
