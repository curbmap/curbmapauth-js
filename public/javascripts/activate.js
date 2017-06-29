'use strict';
$(document).ready(() => {

    let resend = function($event) {
        $event.preventDefault();
        const arrayOfObjects = $('#activateform').serializeArray();
        const username = arrayOfObjects[0].value;
        if (username === "") {
            $('#alerterror').html('<h6>Please enter your username before trying to resend</h6>')
            return false;
        }
        $.ajax({
            url:'https://curbmap.com/resendauth?username='+username,
            headers: {
                'Access-Control-Allow-Origin': true
            }
        }).done((value) => {
            console.log(value);
            if (value['success'] === 1) {
                $('#alerterror').html('<h6>Request was sent, please check your email.</h6>')
            } else if (value['success'] === 0) {
                $('#alerterror').html('<h6>Request could not be sent, check your username.</h6>')
            } else {
                $('#alerterror').html('<h6>Request was not sent, already activated. Continue to <a href="https://curbmap.com">curbmap.com</a> to log in! :-)</h6>')
            }
            return false;
        });
    };

    $("#resend").on('click', resend);
});