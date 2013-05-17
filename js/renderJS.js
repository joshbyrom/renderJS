(function (window, undefined) { // window == context
    var renderJS = function ctor() {

    };

    renderJS.prototype.test = function test_function() {
        console.log("Hello, from renderJS");
    };
    
    window.renderJS = new renderJS();
})(this);