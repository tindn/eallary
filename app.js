$(function(){

  var Eatery = Backbone.Model.extend({

    // Default attributes for the eatery.
    defaults: function() {
      return {
        name: "New Eatery",
        order: Eateries.nextOrder(),
        address: "New Address"
      };
    },

    // Ensure that each todo created has `name`.
    initialize: function() {
      if (!this.get("name")) {
        this.set({"name": this.defaults().name});
      }
    },

    isCurrentlyOpen: function() {
      var currentTime = new Date();
      var dayOfWeek = currentTime.getDay();

      if(!(this.get("hours")) || (!this.get("hours")[dayOfWeek]))
      {
        return true;
      }

      var year = currentTime.getFullYear();
      var date = currentTime.getDate();
      var month = currentTime.getMonth();
      var hoursString = this.get("hours")[dayOfWeek].hour;
      var hoursRegex = /(\d+\W*\d*\w{2})\W*(\d+\W*\d*\w{2})/;
      var hoursArray = hoursRegex.exec(hoursString);
      if (!hoursArray)
      {
        return true;
      }
      
      var hourMinuteRegex = /(\d+)\W*(\d*)(\w{2})/;
      var openTimeArray = hourMinuteRegex.exec(hoursArray[1]);
      var openTime = new Date(year, month, date, openTimeArray[1], openTimeArray[2]);
      if (openTimeArray[3] === "PM" || openTimeArray[3] === "pm")
      {
        openTime.setHours(openTime.getHours() + 12);
      }

      if(openTimeArray[1] === "12" && (openTimeArray[3] === "AM" || openTimeArray[3] === "am")) 
      {
        openTime.setHours(openTime.getHours() + 12); 
      }

      var closeTimeArray = hourMinuteRegex.exec(hoursArray[2]);
      var closeTime = new Date(year, month, date, closeTimeArray[1], closeTimeArray[2]);
      if (closeTimeArray[3] === "PM" || closeTimeArray[3] === "pm")
      {
        closeTime.setHours(closeTime.getHours() + 12);
      }

      if(closeTimeArray[1] === "12" && (closeTimeArray[3] === "AM" || closeTimeArray[3] === "am")) 
      {
        closeTime.setHours(closeTime.getHours() + 12); 
      }

      if (closeTime < openTime) {
        closeTime.setHours(closeTime.getHours() + 24);
      }
      
      return (currentTime >= openTime && currentTime < closeTime);
    }
  });

  var EateryCollection = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Eatery,

    //url: "./eateries.json",
    url: "http://pixiecloud.herokuapp.com/eallary/eateries",
    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    comparator: function(eatery) {
      return eatery.get('order');
    },

    getCuisines: function() {
      return this.reduce(function(previousArray, currentEatery){
        currentEatery.attributes.cuisines.forEach(function(cuisine, index, array) {
          if (previousArray.indexOf(cuisine) === -1)
            previousArray.push(cuisine);
        });
        return previousArray;
      }, []);
    },

    filterCuisines: function(cuisine) {
      return this.filter(function(eatery){return eatery.attributes.cuisines.includes(cuisine);});
    }

  });

  var Eateries = new EateryCollection;


  var EateryView = Backbone.View.extend({

    tagName:  "li",

    attributes: {
      class: 'eatery'
    },

    template: _.template($('#item-template').html()),

    events: {
      "click .label"   : "toggleDetails"
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.input = this.$('.edit');
      return this;
    },

    toggleDetails: function(event) {
      this.$('.details').toggle();
    }

  });

  var CuisineFilter = Backbone.Model.extend({

    defaults: {
        display: "All",
        filter: "all",
        isSet: true
    }

  });

  var CuisineFilterCollection = Backbone.Collection.extend({

    model: CuisineFilter,

    getSetFilters: function() {
      return this.models.filter(function(cuisine) { return cuisine.get("isSet"); });
    }

  });

  var CuisineFilters = new CuisineFilterCollection;

  var CuisineFilterView = Backbone.View.extend({

    tagName: "li",

    template: _.template($('#cuisine-filter-template').html()),

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },

    events: {
      "click .filter": "filterClicked"
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    filterClicked: function(event) {
      this.model.set("isSet",!this.model.attributes.isSet);
      this.trigger("filterClicked", CuisineFilters.getSetFilters().reduce(function(prev, curr){
        prev.push(curr.get("filter"));
        return prev;
      },[]));
    }

  });

  var AppView = Backbone.View.extend({

    el: $("#eallary-app"),

    events: {
    },

    initialize: function() {

      this.listenTo(Eateries, 'add', this.addEatery);
      this.listenTo(Eateries, 'reset', this.addEateries);
      this.listenTo(Eateries, 'all', this.render);
      this.listenTo(CuisineFilters, 'add', this.addFilter);

      this.footer = this.$('footer');
      this.main = $('#main');

      Eateries.fetch({
        success: this.setCuisines
      });

    },

    setCuisines: function(cuisines) {
      var cuisines = Eateries.getCuisines();
      var cuisinesModels = cuisines.reduce(function(previousArray, current) {
        previousArray.push(new CuisineFilter({
          display: current,
          filter: current,
          isSet: false
        }));
        return previousArray;
      }, []);

      CuisineFilters.set(cuisinesModels);
    },

    updateEateries: function(filters) {
      if (filters.length == 0 || filters.indexOf("all") != -1)
      {
        this.addEateries();
        return;
      }

      this.$("#eatery-list").empty();
      var allEateries = Eateries;
      var filtered = Eateries.filter(function(eatery) 
      {
        var match = false;
        for (var i = 0; i < filters.length; i ++) {
          if (eatery.get("cuisines").includes(filters[i])) {
            match = true;
            break;
          }
        }
        return match;
      });
      filtered.forEach(this.addEatery, this);
    },

    render: function() {
      if (Eateries.length) {
        this.main.show();
        this.footer.show();
      } else {
        this.main.hide();
        this.footer.hide();
      }
    },

    addFilter: function(filter){
      var view = new CuisineFilterView({model: filter});
      this.$("#cuisine-list").append(view.render().el);
      this.listenTo(view, "filterClicked", this.updateEateries);
    },

    addEatery: function(eatery) {
      var view = new EateryView({model: eatery});
      eatery.isCurrentlyOpen();
      this.$("#eatery-list").append(view.render().el);
    },

    addEateries: function() {
      this.$("#eatery-list").empty();
      Eateries.each(this.addEatery, this);
    }

  });

  // Finally, we kick things off by creating the **App**.
  var App = new AppView;

});
