node {
    stage('Clone repo') {
        checkout([
          $class: 'GitSCM',
          branches: scm.branches,
          doGenerateSubmoduleConfigurations: false,
          extensions: [[
              $class: 'SubmoduleOption',
              disableSubmodules: false,
              parentCredentials: true,
              recursiveSubmodules: true,
              reference: '',
              trackingSubmodules: false
          ]],
          submoduleCfg: [],
          userRemoteConfigs: scm.userRemoteConfigs
      ])
    }
    stage('Unit test') {
            nodejs(nodeJSInstallationName: '14.15.4') {
                sh 'yarn install --frozen-lockfile'
                sh 'yarn lint'
                sh 'yarn test'
            }
    }
}
