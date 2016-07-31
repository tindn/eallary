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
    }
  });

  var EateryCollection = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Eatery,

    url: "./eateries.json",

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

  var AppView = Backbone.View.extend({

    el: $("#eallary-app"),

    events: {
      "click #cuisine-list li a": "filterCuisine"
    },

    initialize: function() {

      this.listenTo(Eateries, 'add', this.addOne);
      this.listenTo(Eateries, 'reset', this.addAll);
      this.listenTo(Eateries, 'all', this.render);

      this.footer = this.$('footer');
      this.main = $('#main');

      Eateries.fetch({
        success: this.setCuisines
      });
    },

    setCuisines: function(cuisines) {
      var cuisines = Eateries.getCuisines();
      cuisines.splice(0,0,"all");
      cuisines.forEach(function(current, index, array) {
        $("#cuisine-list").append("<li><a href='#' data-filter='"+current+"'>"+ current + "</a></li>");
      });
    },

    filterCuisine: function(event) {
      var value = $(event.currentTarget).data('filter');
      if (value === "all")
      {
        this.addAll();
        return;
      }
      this.$("#eatery-list").empty();
      var filtered = Eateries.filter(function(eatery){return eatery.attributes.cuisines.includes(value);});
      filtered.forEach(this.addOne, this);
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

    addOne: function(eatery) {
      var view = new EateryView({model: eatery});
      this.$("#eatery-list").append(view.render().el);
    },

    addAll: function() {
      this.$("#eatery-list").empty();
      Eateries.each(this.addOne, this);
    },

    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      if (!this.input.val()) return;

      Eateries.create({title: this.input.val()});
      this.input.val('');
    }

  });

  // Finally, we kick things off by creating the **App**.
  var App = new AppView;

});
