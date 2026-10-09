import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { ConfirmDialogComponent, type ConfirmData } from '../../shared/ui/confirm-dialog/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  confirm(data: ConfirmData): Promise<boolean> {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, { data });
    return ref.closed.toPromise().then((v) => v ?? false);
  }
}
