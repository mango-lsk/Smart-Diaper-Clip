import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {BrowserModule, HammerModule} from '@angular/platform-browser';
import {IonicModule} from '@ionic/angular';
import {AppComponent} from './app.component';

import {ServiceModule} from 'services';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {HomeModule} from 'home';




const routes: Routes = [
    {path: 'home', loadChildren: () => HomeModule},
    {path: '**', redirectTo: 'home', pathMatch: 'full'},
];

@NgModule({
    declarations: [
        AppComponent,

  

    ],
    imports: [
        RouterModule.forRoot(routes),
        BrowserModule,
        HammerModule,
        ServiceModule,
        IonicModule.forRoot(),
        NoopAnimationsModule
    ],
    providers: [
    ],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule
{
}
