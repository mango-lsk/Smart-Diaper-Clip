import {Component} from '@angular/core';


@Component({selector: 'app-root', templateUrl: 'app.component.html'})
export class AppComponent implements Ng.OnInit
{
    constructor()
    { }

    ngOnInit(): void
    {
        setTimeout(() => {
            cordova.plugin.SplashScreen.hide();
        }, 500);
    }
}
